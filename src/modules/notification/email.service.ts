import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  content: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@rwalandchain.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'RwaLandChain');

    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');

    switch (emailProvider.toLowerCase()) {
      case 'sendgrid':
        this.initializeSendGrid();
        break;
      case 'ses':
        this.initializeAWSSES();
        break;
      case 'mailgun':
        this.initializeMailgun();
        break;
      case 'smtp':
      default:
        this.initializeSMTP();
        break;
    }
  }

  private initializeSMTP() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete. Email service may not work properly.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`Email service initialized with SMTP: ${host}:${port}`);
  }

  private initializeSendGrid() {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      this.logger.warn('SendGrid API key not configured. Email service may not work properly.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });

    this.logger.log('Email service initialized with SendGrid');
  }

  private initializeAWSSES() {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS SES credentials not configured. Email service may not work properly.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      SES: {
        aws: {
          region,
          accessKeyId,
          secretAccessKey,
        },
      },
    });

    this.logger.log(`Email service initialized with AWS SES in region: ${region}`);
  }

  private initializeMailgun() {
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');

    if (!domain || !apiKey) {
      this.logger.warn('Mailgun configuration incomplete. Email service may not work properly.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      service: 'Mailgun',
      auth: {
        user: `postmaster@${domain}`,
        pass: apiKey,
      },
    });

    this.logger.log(`Email service initialized with Mailgun domain: ${domain}`);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: options.from || `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.content,
        html: options.html || this.generateHTML(options.content, options.subject),
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully to ${options.to}. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const sent = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failed = results.length - sent;

    this.logger.log(`Bulk email sending completed. Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Welcome to RwaLandChain',
      content: `Dear ${userName},\n\nWelcome to RwaLandChain! Your account has been successfully created.\n\nBest regards,\nThe RwaLandChain Team`,
      html: this.generateWelcomeHTML(userName),
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to,
      subject: 'Password Reset Request - RwaLandChain',
      content: `You have requested a password reset. Click the following link to reset your password: ${resetUrl}\n\nIf you did not request this, please ignore this email.`,
      html: this.generatePasswordResetHTML(resetUrl),
    });
  }

  async sendNotificationEmail(to: string, title: string, content: string, data?: any): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `RwaLandChain Notification: ${title}`,
      content,
      html: this.generateNotificationHTML(title, content, data),
    });
  }

  async sendComplianceAlert(to: string, parcelId: string, violationType: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Compliance Alert - Parcel #${parcelId}`,
      content: `Your land parcel #${parcelId} has a compliance issue: ${violationType}. Please take necessary action.`,
      html: this.generateComplianceAlertHTML(parcelId, violationType),
    });
  }

  async sendExpropriationNotice(to: string, parcelId: string, authority: string, compensation: number): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Expropriation Notice - Parcel #${parcelId}`,
      content: `Your land parcel #${parcelId} has been flagged for expropriation by ${authority}. Proposed compensation: ${compensation} RWF.`,
      html: this.generateExpropriationNoticeHTML(parcelId, authority, compensation),
    });
  }

  async sendDisputeNotification(to: string, disputeId: string, disputeType: string, isPlaintiff: boolean): Promise<boolean> {
    const subject = isPlaintiff 
      ? `Dispute Created - #${disputeId}`
      : `Dispute Filed Against You - #${disputeId}`;
    
    const content = isPlaintiff
      ? `Your dispute #${disputeId} (${disputeType}) has been created and is under review.`
      : `A dispute #${disputeId} (${disputeType}) has been filed against you. Please review and respond.`;

    return this.sendEmail({
      to,
      subject,
      content,
      html: this.generateDisputeNotificationHTML(disputeId, disputeType, isPlaintiff),
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection verification failed:', error);
      return false;
    }
  }

  // HTML template generators
  private generateHTML(content: string, title?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'RwaLandChain Notification'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RwaLandChain</h1>
          </div>
          <div class="content">
            ${content.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>This email was sent by RwaLandChain. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeHTML(userName: string): string {
    return this.generateHTML(`
      <h2>Welcome to RwaLandChain, ${userName}!</h2>
      <p>Your account has been successfully created. You can now:</p>
      <ul>
        <li>View and manage your land parcels</li>
        <li>Participate in DAO governance</li>
        <li>Monitor compliance status</li>
        <li>Access dispute resolution services</li>
      </ul>
      <p>Get started by connecting your wallet and exploring the platform.</p>
    `, 'Welcome to RwaLandChain');
  }

  private generatePasswordResetHTML(resetUrl: string): string {
    return this.generateHTML(`
      <h2>Password Reset Request</h2>
      <p>You have requested a password reset for your RwaLandChain account.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this password reset, please ignore this email.</p>
    `, 'Password Reset Request');
  }

  private generateNotificationHTML(title: string, content: string, data?: any): string {
    let htmlContent = `<h2>${title}</h2><p>${content}</p>`;
    
    if (data) {
      htmlContent += '<hr><h3>Additional Information:</h3>';
      htmlContent += '<ul>';
      Object.entries(data).forEach(([key, value]) => {
        htmlContent += `<li><strong>${key}:</strong> ${value}</li>`;
      });
      htmlContent += '</ul>';
    }

    return this.generateHTML(htmlContent, title);
  }

  private generateComplianceAlertHTML(parcelId: string, violationType: string): string {
    return this.generateHTML(`
      <h2>⚠️ Compliance Alert</h2>
      <p><strong>Parcel ID:</strong> #${parcelId}</p>
      <p><strong>Violation Type:</strong> ${violationType}</p>
      <p>Your land parcel has been found to be non-compliant with current regulations. Please take immediate action to address this issue.</p>
      <p>For more information, please log into your RwaLandChain account and review the compliance details.</p>
    `, `Compliance Alert - Parcel #${parcelId}`);
  }

  private generateExpropriationNoticeHTML(parcelId: string, authority: string, compensation: number): string {
    return this.generateHTML(`
      <h2>📋 Expropriation Notice</h2>
      <p><strong>Parcel ID:</strong> #${parcelId}</p>
      <p><strong>Authority:</strong> ${authority}</p>
      <p><strong>Proposed Compensation:</strong> ${compensation.toLocaleString()} RWF</p>
      <p>Your land parcel has been flagged for expropriation for public use. You have the right to:</p>
      <ul>
        <li>Review the expropriation details</li>
        <li>Accept or dispute the proposed compensation</li>
        <li>Seek legal counsel if needed</li>
      </ul>
      <p>Please log into your RwaLandChain account to review the full details and take appropriate action.</p>
    `, `Expropriation Notice - Parcel #${parcelId}`);
  }

  private generateDisputeNotificationHTML(disputeId: string, disputeType: string, isPlaintiff: boolean): string {
    const title = isPlaintiff ? '📝 Dispute Created' : '⚖️ Dispute Filed Against You';
    const content = isPlaintiff
      ? `Your dispute has been successfully created and submitted for review.`
      : `A dispute has been filed against you. Please review the details and respond accordingly.`;

    return this.generateHTML(`
      <h2>${title}</h2>
      <p><strong>Dispute ID:</strong> #${disputeId}</p>
      <p><strong>Dispute Type:</strong> ${disputeType}</p>
      <p>${content}</p>
      <p>You can track the progress of this dispute and submit evidence through your RwaLandChain account.</p>
      ${!isPlaintiff ? '<p><strong>Important:</strong> Please respond within the specified timeframe to avoid default judgment.</p>' : ''}
    `, `Dispute Notification - #${disputeId}`);
  }
}


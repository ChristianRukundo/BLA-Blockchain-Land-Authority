import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: this.configService.get('email.secure'),
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.password'),
      },

      ...(this.configService.get('app.nodeEnv') === 'development' && {
        debug: true,
        logger: true,
      }),
    });

    this.verifyConnection();

    this.loadTemplates();

    this.registerHandlebarsHelpers();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (error) {
      this.logger.error('Failed to establish SMTP connection:', error);
    }
  }

  private registerHandlebarsHelpers() {
    handlebars.registerHelper('formatDate', function (date, format) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    handlebars.registerHelper('formatCurrency', function (amount, currency = 'USD') {
      if (amount === undefined || amount === null) return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    handlebars.registerHelper('ifCond', function (
      this: any,
      v1: any,
      operator: string,
      v2: any,
      options: any
    ) {
      switch (operator) {
        case '==':
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=':
          return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '!==':
          return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case '<':
          return v1 < v2 ? options.fn(this) : options.inverse(this);
        case '<=':
          return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case '>':
          return v1 > v2 ? options.fn(this) : options.inverse(this);
        case '>=':
          return v1 >= v2 ? options.fn(this) : options.inverse(this);
        case '&&':
          return v1 && v2 ? options.fn(this) : options.inverse(this);
        case '||':
          return v1 || v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });
  }



  private loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, 'templates');

      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
        this.logger.log(`Created templates directory at ${templatesDir}`);
        return;
      }

      const templateFiles = fs.readdirSync(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = path.parse(file).name;
          const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
          this.templates.set(templateName, handlebars.compile(templateContent));
          this.logger.log(`Loaded email template: ${templateName}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load email templates:', error);
    }
  }

  async sendEmail(to: string, subject: string, template: string, context: any) {
    try {
      const enrichedContext = {
        ...context,
        appUrl: this.configService.get('email.appUrl'),
        logoUrl: this.configService.get('email.logoUrl') || 'https://rwalandchain.com/logo.png',
        supportEmail: this.configService.get('email.supportEmail') || 'support@rwalandchain.com',
        currentYear: new Date().getFullYear(),
      };

      const templateFn = this.templates.get(template);
      if (!templateFn) {
        const html = this.generateBasicTemplate(subject, context.message || 'No message provided');

        await this.transporter.sendMail({
          from: this.configService.get('email.from'),
          to,
          subject,
          html,
        });

        this.logger.log(`Email sent successfully to ${to} using fallback template`);
        return;
      }

      const html = templateFn(enrichedContext);

      await this.transporter.sendMail({
        from: this.configService.get('email.from'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to} using template ${template}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }  

  private generateBasicTemplate(subject: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
          }
          .content {
            padding: 30px 20px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 0.875rem;
            border-top: 1px solid #eaeaea;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>This email was sent by RwaLandChain. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} RwaLandChain. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.sendEmail(to, 'Welcome to RwaLandChain', 'welcome', {
      name,
      loginUrl: this.configService.get('app.url') + '/login',
      supportEmail: this.configService.get('support.email'),
      logoUrl: this.configService.get('app.logoUrl'),
      currentYear: new Date().getFullYear(),
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const resetUrl = `${this.configService.get('app.url')}/reset-password?token=${token}`;
    await this.sendEmail(to, 'Reset Your Password', 'password-reset', {
      name,
      resetUrl,
      expiryHours: 24,
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }

  async sendEmailVerification(to: string, name: string, token: string) {
    const verifyUrl = `${this.configService.get('app.url')}/verify-email?token=${token}`;
    await this.sendEmail(to, 'Verify Your Email', 'email-verification', {
      name,
      verifyUrl,
      expiryHours: 24,
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }

  async send2FASetupEmail(
    to: string,
    name: string,
    qrCodeUrl: string,
    setupKey: string,
    backupCodes: string[],
  ) {
    await this.sendEmail(to, '2FA Setup Instructions', '2fa-setup', {
      name,
      qrCodeUrl,
      setupKey,
      backupCodes,
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }

  async sendLoginAlert(
    to: string,
    name: string,
    ipAddress: string,
    location: string,
    deviceInfo: string,
  ) {
    await this.sendEmail(to, 'New Login Detected', 'login-alert', {
      name,
      ipAddress,
      location,
      deviceInfo,
      loginTime: new Date().toLocaleString(),
      supportEmail: this.configService.get('support.email'),
      securitySettingsUrl: `${this.configService.get('app.url')}/settings/security`,
      currentYear: new Date().getFullYear(),
    });
  }

  async sendActionRequiredEmail(
    to: string,
    name: string,
    action: string,
    reason: string,
    deadline?: Date,
  ) {
    await this.sendEmail(to, 'Action Required', 'action-required', {
      name,
      action,
      reason,
      deadline: deadline?.toLocaleString(),
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }

  async sendTransactionConfirmation(
    to: string,
    name: string,
    transactionType: string,
    details: any,
  ) {
    await this.sendEmail(to, 'Transaction Confirmation', 'transaction-confirmation', {
      name,
      transactionType,
      ...details,
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }

  async sendAdminActionNotification(
    to: string,
    name: string,
    actionType: string,
    status: string,
    details: any,
  ) {
    await this.sendEmail(to, `Admin Action ${status}`, 'admin-action', {
      name,
      actionType,
      status,
      ...details,
      supportEmail: this.configService.get('support.email'),
      currentYear: new Date().getFullYear(),
    });
  }
}

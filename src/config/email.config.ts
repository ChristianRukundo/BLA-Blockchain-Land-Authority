import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || 'your-email@gmail.com',
  password: process.env.SMTP_PASSWORD || 'your-app-password',

  from: process.env.EMAIL_FROM || 'RwaLandChain <noreply@rwalandchain.com>',

  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  logoUrl: process.env.LOGO_URL || 'https://rwalandchain.com/logo.png',

  supportEmail: process.env.SUPPORT_EMAIL || 'support@rwalandchain.com',
  supportPhone: process.env.SUPPORT_PHONE || '+1234567890',

  templateDir: process.env.EMAIL_TEMPLATE_DIR || 'src/modules/email/templates',

  rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT, 10) || 100,
  batchSize: parseInt(process.env.EMAIL_BATCH_SIZE, 10) || 10,

  verificationTokenExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY, 10) || 24,

  passwordResetTokenExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY, 10) || 1,
}));

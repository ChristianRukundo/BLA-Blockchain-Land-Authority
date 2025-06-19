import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // Account lockout settings
  lockout: {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
  },

  // Session settings
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },

  // Email verification
  emailVerification: {
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    resendCooldown: 5 * 60 * 1000, // 5 minutes
  },

  // Password reset
  passwordReset: {
    tokenExpiry: 60 * 60 * 1000, // 1 hour
    resendCooldown: 5 * 60 * 1000, // 5 minutes
  },

  // OAuth settings (for future use)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },

  // Rate limiting for auth endpoints
  rateLimiting: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per hour per IP
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset requests per hour per IP
    },
  },
}));


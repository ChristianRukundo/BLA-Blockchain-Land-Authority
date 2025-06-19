import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  apiPrefix: process.env.API_PREFIX || 'api',
  apiVersion: process.env.API_VERSION || 'v1',
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  // Security
  helmet: {
    enabled: process.env.HELMET_ENABLED === 'true',
  },
  
  compression: {
    enabled: process.env.COMPRESSION_ENABLED === 'true',
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'
    ],
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFile: process.env.LOG_FILE || 'logs/app.log',

  // Features
  swagger: {
    enabled: process.env.ENABLE_SWAGGER === 'true',
    title: 'RwaLandChain API',
    description: 'API documentation for RwaLandChain backend services',
    version: '2.0.0',
    path: 'api',
  },

  metrics: {
    enabled: process.env.ENABLE_METRICS === 'true',
  },

  healthCheck: {
    enabled: process.env.ENABLE_HEALTH_CHECK === 'true',
  },

  // External Services
  ipfs: {
    host: process.env.IPFS_HOST || 'localhost',
    port: parseInt(process.env.IPFS_PORT, 10) || 5001,
    protocol: process.env.IPFS_PROTOCOL || 'http',
  },

  blockchain: {
    arbitrumSepoliaRpc: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    arbitrumOneRpc: process.env.ARBITRUM_ONE_RPC_URL,
    privateKey: process.env.PRIVATE_KEY,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@rwalandchain.com',
  },

  // External APIs
  externalApis: {
    chainlink: process.env.CHAINLINK_API_URL,
    kleros: process.env.KLEROS_API_URL,
  },
}));


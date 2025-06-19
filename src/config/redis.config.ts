import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  ttl: parseInt(process.env.REDIS_TTL, 10) || 3600, // 1 hour default TTL
  
  // Connection options
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  
  // Connection pool
  family: 4, // 4 (IPv4) or 6 (IPv6)
  keepAlive: true,
  
  // Cluster configuration (for future scaling)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
  },

  // Key prefixes for different data types
  keyPrefixes: {
    session: 'sess:',
    cache: 'cache:',
    queue: 'queue:',
    lock: 'lock:',
    rate_limit: 'rl:',
    user_data: 'user:',
    notification: 'notif:',
  },

  // TTL settings for different data types
  ttlSettings: {
    session: 24 * 60 * 60, // 24 hours
    cache: 60 * 60, // 1 hour
    shortCache: 5 * 60, // 5 minutes
    longCache: 24 * 60 * 60, // 24 hours
    rateLimit: 60 * 60, // 1 hour
    lock: 30, // 30 seconds
  },
}));


import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'rwalandchain',
    synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
    logging: process.env.DB_LOGGING === 'true' || false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
    subscribers: [join(__dirname, '../database/subscribers/*{.ts,.js}')],
    migrationsTableName: 'migrations',
    migrationsRun: false,
    dropSchema: false,
    retryAttempts: 3,
    retryDelay: 3000,
    maxQueryExecutionTime: 10000,
    cache: {
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB, 10) || 0,
        ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
      },
    },
    extra: {
      // Connection pool settings
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
      // Enable PostGIS
      application_name: 'rwalandchain-backend',
    },
  }),
);


import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { redisStore } from 'cache-manager-redis-store';

import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import redisConfig from './config/redis.config';
import emailConfig from './config/email.config';

import { AuthModule } from './modules/auth/auth.module';

import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { LaisModule } from './modules/lais/lais.module';
import { IpfsModule } from './modules/ipfs/ipfs.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { ExpropriationModule } from './modules/expropriation/expropriation.module';
import { HealthModule } from './modules/health/health.module';
import { EmailModule } from './modules/email/email.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, authConfig, redisConfig, emailConfig],
      envFilePath: ['.env.development.local', '.env.development', '.env.local', '.env'],
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        ...configService.get<TypeOrmModuleOptions>('database'),
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<any> => {
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');
        const db = configService.get<number>('redis.db');
        const ttlMilliseconds = configService.get<number>('redis.ttl', 60) * 1000;

        const store = await redisStore({
          socket: { host, port },
          password: password || undefined,
          database: db || 0,
          ttl: ttlMilliseconds,
        });

        return {
          store: store as unknown as CacheStore,
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        // FIX: Wrap ttl and limit in a 'throttlers' array
        throttlers: [
          {
            ttl: configService.get<number>('app.throttle.ttl', 60000),
            limit: configService.get<number>('app.throttle.limit', 10),
          },
        ],
      }),
    }),

    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('app.logLevel', 'info'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json(),
        ),
        defaultMeta: { service: configService.get<string>('app.name', 'rwalandchain-backend') },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ level, message, timestamp, service, stack, ...metadata }) => {
                  let log = `${timestamp} [${service}] ${level}: ${message}`;
                  if (stack) {
                    log += `\nStack: ${stack}`;
                  }
                  if (Object.keys(metadata).length > 0 && metadata.constructor === Object) {
                    log += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
                  }
                  return log;
                },
              ),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true,
          }),
        ],
        exitOnError: false,
      }),
    }),

    AuthModule,
    // UserModule,
    UserProfileModule,
    LaisModule,
    IpfsModule,
    NotificationModule,
    AdminModule,
    ExpropriationModule,
    HealthModule,
    EmailModule,
    GovernanceModule,
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

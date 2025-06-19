import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getAppInfo() {
    const nodeEnv = this.configService.get('app.nodeEnv');
    const port = this.configService.get('app.port');
    const apiPrefix = this.configService.get('app.apiPrefix');

    return {
      name: 'RwaLandChain Backend API',
      version: '2.0.0',
      description: 'Backend API for RwaLandChain - Blockchain-powered land administration system for Rwanda',
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      endpoints: {
        api: `/${apiPrefix}`,
        docs: `/${apiPrefix}`,
        health: `/${apiPrefix}/health`,
      },
      features: [
        'User Authentication & Authorization',
        'Land Parcel Management (LAIS)',
        'IPFS Integration',
        'Notification System',
        'Administrative Operations',
        'Expropriation Management',
        'Real-time Updates',
        'Comprehensive API Documentation',
      ],
      technologies: {
        framework: 'NestJS',
        database: 'PostgreSQL with PostGIS',
        cache: 'Redis',
        blockchain: 'Arbitrum One',
        storage: 'IPFS',
        authentication: 'JWT',
        documentation: 'Swagger/OpenAPI',
      },
    };
  }

  getVersion() {
    return {
      version: '2.0.0',
      apiVersion: this.configService.get('app.apiVersion'),
      buildDate: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      nodeVersion: process.version,
      environment: this.configService.get('app.nodeEnv'),
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0',
      environment: this.configService.get('app.nodeEnv'),
    };
  }
}


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getSimpleHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0',
      environment: this.configService.get('app.nodeEnv'),
    };
  }

  getDetailedHealth() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
    };

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0',
      environment: this.configService.get('app.nodeEnv'),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
        loadAverage: os.loadavg(),
        memory: {
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
          },
          system: {
            total: systemMemory.total,
            free: systemMemory.free,
            used: systemMemory.used,
            percentage: ((systemMemory.used / systemMemory.total) * 100).toFixed(2),
          },
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown',
          speed: os.cpus()[0]?.speed || 0,
        },
      },
      services: this.getServicesStatus(),
      configuration: {
        nodeEnv: this.configService.get('app.nodeEnv'),
        port: this.configService.get('app.port'),
        apiPrefix: this.configService.get('app.apiPrefix'),
        corsEnabled: !!this.configService.get('app.cors.origin'),
        swaggerEnabled: this.configService.get('app.swagger.enabled'),
        helmetEnabled: this.configService.get('app.helmet.enabled'),
        compressionEnabled: this.configService.get('app.compression.enabled'),
      },
    };
  }

  private getServicesStatus() {
    // This would typically check actual service connections
    // For now, we'll return a basic status
    return {
      database: 'connected', // Would check TypeORM connection
      redis: 'connected', // Would check Redis connection
      ipfs: 'unknown', // Would check IPFS connection
      blockchain: 'unknown', // Would check blockchain RPC connection
    };
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      // This would implement actual database connection check
      // For now, return true
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkRedisConnection(): Promise<boolean> {
    try {
      // This would implement actual Redis connection check
      // For now, return true
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkIPFSConnection(): Promise<boolean> {
    try {
      // This would implement actual IPFS connection check
      // For now, return true
      return true;
    } catch (error) {
      return false;
    }
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg(),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
    };
  }
}


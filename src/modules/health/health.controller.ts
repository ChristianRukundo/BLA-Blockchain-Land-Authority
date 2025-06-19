import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get application health status',
    description: 'Returns the overall health status of the application and its dependencies'
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' }
              }
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' }
              }
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' }
              }
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' }
              }
            }
          }
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' }
              }
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                used: { type: 'number', example: 50331648 },
                limit: { type: 'number', example: 134217728 }
              }
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                used: { type: 'number', example: 67108864 },
                limit: { type: 'number', example: 268435456 }
              }
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                used: { type: 'number', example: 1073741824 },
                available: { type: 'number', example: 10737418240 }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - health check failed'
  })
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),
      
      // Memory health checks
      () => this.memory.checkHeap('memory_heap', 128 * 1024 * 1024), // 128MB
      () => this.memory.checkRSS('memory_rss', 256 * 1024 * 1024), // 256MB
      
      // Disk health check
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 // 90% threshold
      }),
    ]);
  }

  @Get('simple')
  @ApiOperation({
    summary: 'Simple health check',
    description: 'Returns a simple health status without detailed checks'
  })
  @ApiResponse({
    status: 200,
    description: 'Simple health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '2.0.0' },
        environment: { type: 'string', example: 'development' }
      }
    }
  })
  simpleCheck() {
    return this.healthService.getSimpleHealth();
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns detailed health information including system metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '2.0.0' },
        environment: { type: 'string', example: 'development' },
        system: {
          type: 'object',
          properties: {
            platform: { type: 'string', example: 'linux' },
            arch: { type: 'string', example: 'x64' },
            nodeVersion: { type: 'string', example: 'v18.17.0' },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
                free: { type: 'number' },
                percentage: { type: 'number' }
              }
            },
            cpu: {
              type: 'object',
              properties: {
                usage: { type: 'number' },
                cores: { type: 'number' }
              }
            }
          }
        },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            redis: { type: 'string', example: 'connected' },
            ipfs: { type: 'string', example: 'connected' }
          }
        }
      }
    }
  })
  detailedCheck() {
    return this.healthService.getDetailedHealth();
  }
}


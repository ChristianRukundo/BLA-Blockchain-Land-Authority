import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get application information',
    description: 'Returns basic information about the RwaLandChain backend API'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'RwaLandChain Backend API' },
        version: { type: 'string', example: '2.0.0' },
        description: { type: 'string', example: 'Backend API for RwaLandChain - Blockchain-powered land administration system' },
        environment: { type: 'string', example: 'development' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
        endpoints: {
          type: 'object',
          properties: {
            api: { type: 'string', example: '/api' },
            docs: { type: 'string', example: '/api' },
            health: { type: 'string', example: '/api/health' },
          }
        }
      }
    }
  })
  getAppInfo() {
    return this.appService.getAppInfo();
  }

  @Get('version')
  @ApiOperation({ 
    summary: 'Get API version',
    description: 'Returns the current version of the API'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API version retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '2.0.0' },
        apiVersion: { type: 'string', example: 'v1' },
        buildDate: { type: 'string', format: 'date-time' },
        gitCommit: { type: 'string', example: 'abc123def456' },
      }
    }
  })
  getVersion() {
    return this.appService.getVersion();
  }
}


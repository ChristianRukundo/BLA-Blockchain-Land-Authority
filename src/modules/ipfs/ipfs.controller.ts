import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IpfsService, IPFSUploadResult, IPFSFileMetadata } from './ipfs.service';

@ApiTags('IPFS')
@Controller('ipfs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload file to IPFS' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for the file',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        hash: { type: 'string' },
        size: { type: 'number' },
        url: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { metadata?: string },
  ): Promise<IPFSUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let metadata: Partial<IPFSFileMetadata> = {};
    if (body?.metadata) {
      try {
        metadata = JSON.parse(body.metadata);
      } catch (error) {
        throw new BadRequestException('Invalid metadata JSON');
      }
    }

    return this.ipfsService.uploadFile(file, metadata);
  }

  @Post('upload-json')
  @ApiOperation({ summary: 'Upload JSON data to IPFS' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'JSON data to upload',
        },
        filename: {
          type: 'string',
          description: 'Optional filename',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'JSON data uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        hash: { type: 'string' },
      },
    },
  })
  async uploadJson(
    @Body(ValidationPipe) body: { data: any; filename?: string },
  ): Promise<{ hash: string }> {
    const hash = await this.ipfsService.uploadJson(body.data, body.filename);
    return { hash };
  }

  @Post('upload-text')
  @ApiOperation({ summary: 'Upload text content to IPFS' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content to upload',
        },
        filename: {
          type: 'string',
          description: 'Optional filename',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Text content uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        hash: { type: 'string' },
      },
    },
  })
  async uploadText(
    @Body(ValidationPipe) body: { content: string; filename?: string },
  ): Promise<{ hash: string }> {
    const hash = await this.ipfsService.uploadText(body.content, body.filename);
    return { hash };
  }

  @Get('content/:hash')
  @ApiOperation({ summary: 'Get content from IPFS by hash' })
  @ApiParam({ name: 'hash', description: 'IPFS hash' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content retrieved successfully',
  })
  async getContent(@Param('hash') hash: string): Promise<any> {
    return this.ipfsService.getContent(hash);
  }

  @Get('metadata/:hash')
  @ApiOperation({ summary: 'Get file metadata from IPFS' })
  @ApiParam({ name: 'hash', description: 'IPFS hash' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metadata retrieved successfully',
  })
  async getMetadata(@Param('hash') hash: string): Promise<any> {
    return this.ipfsService.getFileMetadata(hash);
  }

  @Get('url/:hash')
  @ApiOperation({ summary: 'Get public URL for IPFS content' })
  @ApiParam({ name: 'hash', description: 'IPFS hash' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
    },
  })
  async getPublicUrl(@Param('hash') hash: string): Promise<{ url: string }> {
    const url = this.ipfsService.getPublicUrl(hash);
    return { url };
  }

  @Post('pin/:hash')
  @ApiOperation({ summary: 'Pin content to ensure persistence' })
  @ApiParam({ name: 'hash', description: 'IPFS hash to pin' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content pinned successfully',
    schema: {
      type: 'object',
      properties: {
        pinned: { type: 'boolean' },
      },
    },
  })
  @Roles('ADMIN', 'SYSTEM')
  async pinContent(@Param('hash') hash: string): Promise<{ pinned: boolean }> {
    const pinned = await this.ipfsService.pinContent(hash);
    return { pinned };
  }

  @Delete('pin/:hash')
  @ApiOperation({ summary: 'Unpin content' })
  @ApiParam({ name: 'hash', description: 'IPFS hash to unpin' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content unpinned successfully',
    schema: {
      type: 'object',
      properties: {
        unpinned: { type: 'boolean' },
      },
    },
  })
  @Roles('ADMIN', 'SYSTEM')
  async unpinContent(@Param('hash') hash: string): Promise<{ unpinned: boolean }> {
    const unpinned = await this.ipfsService.unpinContent(hash);
    return { unpinned };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check IPFS service health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        timestamp: { type: 'string' },
      },
    },
  })
  async healthCheck(): Promise<{ available: boolean; timestamp: string }> {
    const available = await this.ipfsService.isAvailable();
    return {
      available,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get IPFS service statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service statistics',
  })
  @Roles('ADMIN')
  async getStatistics(): Promise<any> {
    return this.ipfsService.getStatistics();
  }
}


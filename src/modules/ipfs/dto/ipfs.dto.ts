import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ description: 'File content as base64 string' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File MIME type', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ description: 'Whether to pin the file', default: true })
  @IsOptional()
  @IsBoolean()
  pin?: boolean;
}

export class UploadJsonDto {
  @ApiProperty({ description: 'JSON data to upload' })
  data: any;

  @ApiProperty({ description: 'Optional filename for the JSON', required: false })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiProperty({ description: 'Whether to pin the file', default: true })
  @IsOptional()
  @IsBoolean()
  pin?: boolean;
}

export class PinFileDto {
  @ApiProperty({ description: 'IPFS hash to pin' })
  @IsString()
  hash: string;

  @ApiProperty({ description: 'Optional name for the pin', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UnpinFileDto {
  @ApiProperty({ description: 'IPFS hash to unpin' })
  @IsString()
  hash: string;
}

export class IpfsFileResponseDto {
  @ApiProperty({ description: 'IPFS hash of the uploaded file' })
  hash: string;

  @ApiProperty({ description: 'File name' })
  filename: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'Upload timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Whether the file is pinned' })
  pinned: boolean;

  @ApiProperty({ description: 'IPFS gateway URL' })
  url: string;
}

export class IpfsStatsDto {
  @ApiProperty({ description: 'Total number of files stored' })
  totalFiles: number;

  @ApiProperty({ description: 'Total storage used in bytes' })
  totalSize: number;

  @ApiProperty({ description: 'Number of pinned files' })
  pinnedFiles: number;

  @ApiProperty({ description: 'Available storage in bytes' })
  availableStorage: number;

  @ApiProperty({ description: 'IPFS node status' })
  nodeStatus: string;
}

export class IpfsHealthDto {
  @ApiProperty({ description: 'IPFS service health status' })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: 'IPFS node ID' })
  nodeId: string;

  @ApiProperty({ description: 'Number of connected peers' })
  connectedPeers: number;

  @ApiProperty({ description: 'Last health check timestamp' })
  lastCheck: Date;

  @ApiProperty({ description: 'Response time in milliseconds' })
  responseTime: number;
}

export class ListFilesDto {
  @ApiProperty({ description: 'Number of files to return', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: 'Number of files to skip', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;

  @ApiProperty({ description: 'Filter by pinned status', required: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class BulkUploadDto {
  @ApiProperty({ description: 'Array of files to upload', type: [UploadFileDto] })
  @IsArray()
  files: UploadFileDto[];

  @ApiProperty({ description: 'Whether to pin all files', default: true })
  @IsOptional()
  @IsBoolean()
  pinAll?: boolean;
}

export class BulkUploadResponseDto {
  @ApiProperty({ description: 'Successfully uploaded files', type: [IpfsFileResponseDto] })
  successful: IpfsFileResponseDto[];

  @ApiProperty({ description: 'Failed uploads with error messages' })
  failed: Array<{
    filename: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Total number of files processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Number of successful uploads' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed uploads' })
  failureCount: number;
}

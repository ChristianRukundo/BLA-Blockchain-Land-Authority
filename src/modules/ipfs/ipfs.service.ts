import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create as ipfsHttpClient, IPFSHTTPClient } from 'ipfs-http-client';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export interface IPFSUploadResult {
  hash: string;
  size: number;
  url: string;
}

export interface IPFSFileMetadata {
  name: string;
  size: number;
  type: string;
  hash: string;
  uploadedAt: Date;
  uploader?: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private ipfsClient: IPFSHTTPClient;
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;
  private readonly pinataJWT: string;
  private readonly ipfsGatewayUrl: string;
  private readonly useLocalNode: boolean;

  constructor(private configService: ConfigService) {
    // IPFS Configuration
    const ipfsUrl = this.configService.get<string>('IPFS_URL', 'http://localhost:5001');
    this.ipfsGatewayUrl = this.configService.get<string>('IPFS_GATEWAY_URL', 'https://ipfs.io/ipfs/');
    this.useLocalNode = this.configService.get<boolean>('USE_LOCAL_IPFS', false);

    // Pinata Configuration (for production pinning)
    this.pinataApiKey = this.configService.get<string>('PINATA_API_KEY');
    this.pinataSecretKey = this.configService.get<string>('PINATA_SECRET_KEY');
    this.pinataJWT = this.configService.get<string>('PINATA_JWT');

    // Initialize IPFS client
    try {
      this.ipfsClient = ipfsHttpClient({
        url: ipfsUrl,
        timeout: 60000,
      });
      this.logger.log(`IPFS client initialized with URL: ${ipfsUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize IPFS client:', error);
    }
  }

  /**
   * Upload a file to IPFS
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata?: Partial<IPFSFileMetadata>
  ): Promise<IPFSUploadResult> {
    try {
      this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);

      let result: IPFSUploadResult;

      if (this.useLocalNode && this.ipfsClient) {
        result = await this.uploadToLocalNode(file);
      } else if (this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey)) {
        result = await this.uploadToPinata(file, metadata);
      } else {
        throw new InternalServerErrorException('No IPFS service configured');
      }

      this.logger.log(`File uploaded successfully: ${result.hash}`);
      return result;
    } catch (error) {
      this.logger.error('File upload failed:', error);
      throw new InternalServerErrorException(`Failed to upload file: ${(error as any).message}`);
    }
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJson(data: any, filename?: string): Promise<string> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');

      this.logger.log(`Uploading JSON data (${buffer.length} bytes)`);

      let hash: string;

      if (this.useLocalNode && this.ipfsClient) {
        const result = await this.ipfsClient.add({
          content: buffer,
          path: filename || 'data.json',
        });
        hash = result.cid.toString();
      } else if (this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey)) {
        const formData = new FormData();
        formData.append('file', buffer, {
          filename: filename || 'data.json',
          contentType: 'application/json',
        });

        const metadata = JSON.stringify({
          name: filename || 'JSON Data',
          keyvalues: {
            type: 'json',
            uploadedAt: new Date().toISOString(),
          },
        });
        formData.append('pinataMetadata', metadata);

        const response = await this.pinToIPFS(formData);
        hash = response.IpfsHash;
      } else {
        throw new InternalServerErrorException('No IPFS service configured');
      }

      this.logger.log(`JSON data uploaded successfully: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error('JSON upload failed:', error);
      throw new InternalServerErrorException(`Failed to upload JSON: ${(error as any).message}`);
    }
  }

  /**
   * Upload text content to IPFS
   */
  async uploadText(content: string, filename?: string): Promise<string> {
    try {
      const buffer = Buffer.from(content, 'utf-8');
      this.logger.log(`Uploading text content (${buffer.length} bytes)`);

      let hash: string;

      if (this.useLocalNode && this.ipfsClient) {
        const result = await this.ipfsClient.add({
          content: buffer,
          path: filename || 'content.txt',
        });
        hash = result.cid.toString();
      } else if (this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey)) {
        const formData = new FormData();
        formData.append('file', buffer, {
          filename: filename || 'content.txt',
          contentType: 'text/plain',
        });

        const metadata = JSON.stringify({
          name: filename || 'Text Content',
          keyvalues: {
            type: 'text',
            uploadedAt: new Date().toISOString(),
          },
        });
        formData.append('pinataMetadata', metadata);

        const response = await this.pinToIPFS(formData);
        hash = response.IpfsHash;
      } else {
        throw new InternalServerErrorException('No IPFS service configured');
      }

      this.logger.log(`Text content uploaded successfully: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error('Text upload failed:', error);
      throw new InternalServerErrorException(`Failed to upload text: ${(error as any).message}`);
    }
  }

  /**
   * Retrieve content from IPFS
   */
  async getContent(hash: string): Promise<any> {
    try {
      this.logger.log(`Retrieving content: ${hash}`);

      if (this.useLocalNode && this.ipfsClient) {
        return await this.getFromLocalNode(hash);
      } else {
        return await this.getFromGateway(hash);
      }
    } catch (error) {
      this.logger.error(`Failed to retrieve content ${hash}:`, error);
      throw new InternalServerErrorException(`Failed to retrieve content: ${(error as any).message}`);
    }
  }

  /**
   * Get file metadata from IPFS
   */
  async getFileMetadata(hash: string): Promise<any> {
    try {
      this.logger.log(`Getting metadata for: ${hash}`);

      if (this.useLocalNode && this.ipfsClient) {
        const stats = await this.ipfsClient.files.stat(`/ipfs/${hash}`);
        return {
          hash,
          size: stats.size,
          type: stats.type,
        };
      } else if (this.pinataJWT) {
        const response = await axios.get(
          `https://api.pinata.cloud/data/pinList?hashContains=${hash}`,
          {
            headers: {
              Authorization: `Bearer ${this.pinataJWT}`,
            },
          }
        );

        const pinData = response.data.rows.find((row: any) => row.ipfs_pin_hash === hash);
        return pinData || null;
      } else {
        // Fallback to basic info
        return {
          hash,
          url: this.getPublicUrl(hash),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${hash}:`, error);
      throw new InternalServerErrorException(`Failed to get metadata: ${(error as any).message}`);
    }
  }

  /**
   * Pin content to ensure persistence
   */
  async pinContent(hash: string): Promise<boolean> {
    try {
      this.logger.log(`Pinning content: ${hash}`);

      if (this.useLocalNode && this.ipfsClient) {
        await this.ipfsClient.pin.add(hash);
        return true;
      } else if (this.pinataJWT) {
        await axios.post(
          'https://api.pinata.cloud/pinning/pinByHash',
          {
            hashToPin: hash,
            pinataMetadata: {
              name: `Pinned content ${hash}`,
              keyvalues: {
                pinnedAt: new Date().toISOString(),
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.pinataJWT}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to pin content ${hash}:`, error);
      return false;
    }
  }

  /**
   * Unpin content
   */
  async unpinContent(hash: string): Promise<boolean> {
    try {
      this.logger.log(`Unpinning content: ${hash}`);

      if (this.useLocalNode && this.ipfsClient) {
        await this.ipfsClient.pin.rm(hash);
        return true;
      } else if (this.pinataJWT) {
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
          headers: {
            Authorization: `Bearer ${this.pinataJWT}`,
          },
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to unpin content ${hash}:`, error);
      return false;
    }
  }

  /**
   * Get public URL for IPFS content
   */
  getPublicUrl(hash: string): string {
    return `${this.ipfsGatewayUrl}${hash}`;
  }

  /**
   * Check if IPFS service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (this.useLocalNode && this.ipfsClient) {
        await this.ipfsClient.version();
        return true;
      } else if (this.pinataJWT) {
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            Authorization: `Bearer ${this.pinataJWT}`,
          },
        });
        return response.status === 200;
      }
      return false;
    } catch (error) {
      this.logger.error('IPFS service availability check failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<any> {
    try {
      if (this.useLocalNode && this.ipfsClient) {
        const stats = await this.ipfsClient.stats.repo();
        return {
          repoSize: stats.repoSize,
          storageMax: stats.storageMax,
          numObjects: stats.numObjects,
          version: await this.ipfsClient.version(),
        };
      } else if (this.pinataJWT) {
        const response = await axios.get('https://api.pinata.cloud/data/userPinnedDataTotal', {
          headers: {
            Authorization: `Bearer ${this.pinataJWT}`,
          },
        });
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get IPFS statistics:', error);
      return null;
    }
  }

  // Private methods

  private async uploadToLocalNode(file: Express.Multer.File): Promise<IPFSUploadResult> {
    const result = await this.ipfsClient.add({
      content: file.buffer,
      path: file.originalname,
    });

    return {
      hash: result.cid.toString(),
      size: result.size,
      url: this.getPublicUrl(result.cid.toString()),
    };
  }

  private async uploadToPinata(
    file: Express.Multer.File,
    metadata?: Partial<IPFSFileMetadata>
  ): Promise<IPFSUploadResult> {
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const pinataMetadata = JSON.stringify({
      name: metadata?.name || file.originalname,
      keyvalues: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        uploadedAt: new Date().toISOString(),
        uploader: metadata?.uploader || 'system',
        ...metadata,
      },
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await this.pinToIPFS(formData);

    return {
      hash: response.IpfsHash,
      size: response.PinSize,
      url: this.getPublicUrl(response.IpfsHash),
    };
  }

  private async pinToIPFS(formData: FormData): Promise<any> {
    const headers: any = {
      ...formData.getHeaders(),
    };

    if (this.pinataJWT) {
      headers.Authorization = `Bearer ${this.pinataJWT}`;
    } else if (this.pinataApiKey && this.pinataSecretKey) {
      headers.pinata_api_key = this.pinataApiKey;
      headers.pinata_secret_api_key = this.pinataSecretKey;
    } else {
      throw new InternalServerErrorException('Pinata credentials not configured');
    }

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  }

  private async getFromLocalNode(hash: string): Promise<any> {
    const chunks = [];
    for await (const chunk of this.ipfsClient.cat(hash)) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(content.toString());
    } catch {
      return content.toString();
    }
  }

  private async getFromGateway(hash: string): Promise<any> {
    const response = await axios.get(this.getPublicUrl(hash), {
      timeout: 30000,
      responseType: 'arraybuffer',
    });

    const content = Buffer.from(response.data);

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(content.toString());
    } catch {
      return content.toString();
    }
  }
}


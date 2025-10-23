// lib/storage/s3-client.ts
// S3-compatible storage client (works with AWS S3, Cloudflare R2, etc.)

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string; // For direct public access (optional)
}

export class S3StorageClient {
  private client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for some S3-compatible services like R2
    });
  }

  /**
   * Upload a file to S3/R2 storage
   */
  async uploadFile(
    key: string,
    file: Buffer | Uint8Array | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string; etag?: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
      });

      const result = await this.client.send(command);
      
      return {
        url: this.getPublicUrl(key),
        key,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a file from S3/R2 storage
   */
  async getFile(key: string): Promise<{ body: Buffer; contentType?: string; lastModified?: Date }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const result = await this.client.send(command);
      
      if (!result.Body) {
        throw new Error('File not found or empty');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = result.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);

      return {
        body: buffer,
        contentType: result.ContentType,
        lastModified: result.LastModified,
      };
    } catch (error) {
      console.error('S3 get file error:', error);
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from S3/R2 storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('S3 delete file error:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists in S3/R2 storage
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate the public URL for a file
   */
  private getPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }
    
    // Fallback to S3-style URL
    return `https://${this.config.bucketName}.${this.config.endpoint.replace('https://', '')}/${key}`;
  }

  /**
   * Generate a unique file key for organization and dataset
   */
  generateFileKey(organizationId: string, datasetId: string, fileName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `organizations/${organizationId}/datasets/${datasetId}/files/${timestamp}_${randomId}_${sanitizedFileName}`;
  }
}

// Create storage client instance
let storageClient: S3StorageClient | null = null;

export function getStorageClient(): S3StorageClient {
  if (!storageClient) {
    const config: StorageConfig = {
      endpoint: process.env.STORAGE_ENDPOINT || 'https://s3.amazonaws.com',
      region: process.env.STORAGE_REGION || 'us-east-1',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
      bucketName: process.env.STORAGE_BUCKET_NAME || 'avenai-documents',
      publicUrl: process.env.STORAGE_PUBLIC_URL,
    };

    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('Storage credentials not configured. Please set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY environment variables.');
    }

    storageClient = new S3StorageClient(config);
  }

  return storageClient;
}

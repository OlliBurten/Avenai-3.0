// lib/storage/file-service.ts
// File storage service that handles document uploads and management

import { getStorageClient } from './s3-client';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface UploadedFile {
  id: string;
  url: string;
  key: string;
  size: number;
  contentType: string;
  hash: string;
}

export class FileStorageService {
  /**
   * Upload a file to storage and save metadata to database
   */
  async uploadDocument(
    file: File | Blob,
    organizationId: string,
    datasetId: string,
    userId?: string
  ): Promise<UploadedFile> {
    try {
      const storage = getStorageClient();
      
      // Generate file metadata
      const fileName = (file as any).name || `document_${Date.now()}`;
      const contentType = file.type || 'application/octet-stream';
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileSize = fileBuffer.length;
      
      // Generate file hash for deduplication
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check for duplicate file
      const existingDoc = await prisma.document.findFirst({
        where: {
          organizationId,
          datasetId,
          fileHash,
        },
      });
      
      if (existingDoc) {
        console.log('📄 Duplicate file detected, reusing existing document:', {
          existingDocId: existingDoc.id,
          fileName,
          fileHash: fileHash.substring(0, 16) + '...',
        });
        
        return {
          id: existingDoc.id,
          url: existingDoc.storageUrl || '',
          key: existingDoc.storageKey || '',
          size: Number(existingDoc.fileSize || 0),
          contentType: existingDoc.contentType,
          hash: fileHash,
        };
      }
      
      // Generate unique storage key
      const storageKey = storage.generateFileKey(organizationId, datasetId, fileName);
      
      // Upload to storage
      console.log('📤 Uploading file to storage:', {
        fileName,
        size: fileSize,
        contentType,
        storageKey: storageKey.substring(0, 50) + '...',
      });
      
      const uploadResult = await storage.uploadFile(
        storageKey,
        fileBuffer,
        contentType,
        {
          'organization-id': organizationId,
          'dataset-id': datasetId,
          'user-id': userId || 'unknown',
          'upload-timestamp': new Date().toISOString(),
        }
      );
      
      // Create document record in database
      const document = await prisma.document.create({
        data: {
          title: fileName,
          contentType,
          fileSize: BigInt(fileSize),
          fileHash,
          storageUrl: uploadResult.url,
          storageKey: uploadResult.key,
          storageProvider: 's3', // Could be dynamic based on config
          organizationId,
          datasetId,
          userId,
          status: 'UPLOADING',
          metadata: {
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
            uploadedBy: userId || 'unknown',
            storageProvider: 's3',
            storageKey: uploadResult.key,
          },
        },
      });
      
      console.log('✅ File uploaded successfully:', {
        documentId: document.id,
        fileName,
        storageUrl: uploadResult.url,
        size: fileSize,
      });
      
      return {
        id: document.id,
        url: uploadResult.url,
        key: uploadResult.key,
        size: fileSize,
        contentType,
        hash: fileHash,
      };
      
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get a file from storage
   */
  async getFile(documentId: string): Promise<{ buffer: Buffer; contentType?: string; fileName: string }> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          storageKey: true,
          contentType: true,
          title: true,
          storageProvider: true,
        },
      });
      
      if (!document || !document.storageKey) {
        throw new Error('Document not found or no storage key');
      }
      
      const storage = getStorageClient();
      const fileData = await storage.getFile(document.storageKey);
      
      return {
        buffer: fileData.body,
        contentType: fileData.contentType || document.contentType,
        fileName: document.title,
      };
      
    } catch (error) {
      console.error('❌ File retrieval failed:', error);
      throw new Error(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a signed URL for file access
   */
  async getSignedUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          storageKey: true,
          storageUrl: true,
        },
      });
      
      if (!document || !document.storageKey) {
        throw new Error('Document not found or no storage key');
      }
      
      // If we have a public URL, use it directly
      if (document.storageUrl && expiresIn > 86400) { // 24 hours
        return document.storageUrl;
      }
      
      // Otherwise, generate a signed URL
      const storage = getStorageClient();
      return await storage.getSignedUrl(document.storageKey, expiresIn);
      
    } catch (error) {
      console.error('❌ Signed URL generation failed:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Delete a file from storage and database
   */
  async deleteFile(documentId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          storageKey: true,
          title: true,
        },
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Delete from storage if key exists
      if (document.storageKey) {
        const storage = getStorageClient();
        await storage.deleteFile(document.storageKey);
        console.log('🗑️ File deleted from storage:', {
          documentId,
          storageKey: document.storageKey,
        });
      }
      
      // Delete from database (this will cascade to chunks)
      await prisma.document.delete({
        where: { id: documentId },
      });
      
      console.log('✅ Document deleted successfully:', {
        documentId,
        fileName: document.title,
      });
      
    } catch (error) {
      console.error('❌ File deletion failed:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if a file exists in storage
   */
  async fileExists(documentId: string): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          storageKey: true,
        },
      });
      
      if (!document || !document.storageKey) {
        return false;
      }
      
      const storage = getStorageClient();
      return await storage.fileExists(document.storageKey);
      
    } catch (error) {
      console.error('❌ File existence check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();

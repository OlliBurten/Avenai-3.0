#!/usr/bin/env tsx
/**
 * Download all documents from a dataset to verify RAG answers
 */
import { PrismaClient } from '@prisma/client'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs/promises'
import * as path from 'path'

const prisma = new PrismaClient()

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.STORAGE_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
})

async function downloadDatasetDocs() {
  const datasetId = 'cmh1c687x0001d8hiq6wop6a1' // ZignSec dataset

  console.log('📥 Fetching documents from dataset:', datasetId)
  
  const documents = await prisma.document.findMany({
    where: { datasetId },
    select: {
      id: true,
      title: true,
      storageKey: true,
      contentType: true,
    },
  })

  console.log(`Found ${documents.length} documents`)

  const downloadDir = path.join(process.cwd(), 'downloaded-docs')
  await fs.mkdir(downloadDir, { recursive: true })

  for (const doc of documents) {
    try {
      console.log(`\n📄 Downloading: ${doc.title}`)
      
      const command = new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET_NAME!,
        Key: doc.storageKey,
      })

      const response = await s3.send(command)
      const ext = doc.contentType === 'application/pdf' ? '.pdf' : '.txt'
      const filename = `${doc.title}${ext}`
      const filepath = path.join(downloadDir, filename)

      // Stream to file
      const stream = response.Body as any
      const chunks: Buffer[] = []
      
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      
      const buffer = Buffer.concat(chunks)
      await fs.writeFile(filepath, buffer)
      
      console.log(`✅ Saved: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`)
    } catch (err) {
      console.error(`❌ Failed to download ${doc.title}:`, err)
    }
  }

  console.log(`\n✅ All documents downloaded to: ${downloadDir}`)
  await prisma.$disconnect()
}

downloadDatasetDocs().catch(console.error)


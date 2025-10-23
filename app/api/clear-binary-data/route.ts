import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    // Delete all document chunks that contain binary/PDF metadata
    const binaryPatterns = [
      'EOF StructTreeRoot',
      'Adobe XMP Core',
      'Acrobat PDFMaker',
      'MediaServiceImageTags',
      'ea2c-f2a6-4669-af1d-ff1e40cb265e',
      '%PDF-',
      '%âãÏÓ',
      'endstream',
      'endobj',
      'FlateDecode',
      'ObjStm',
      'Filter',
      'Length',
      'Type',
      'First',
      'N\\s+\\d+'
    ]

    let deletedCount = 0
    const chunksToDelete: string[] = []

    // Find chunks that contain binary patterns
    const chunks = await prisma.documentChunk.findMany({
      select: {
        id: true,
        content: true,
      },
    })

    console.log(`Found ${chunks.length} total chunks to check.`)

    for (const chunk of chunks) {
      // Check if the chunk contains binary patterns
      const isBinary = binaryPatterns.some(pattern => 
        chunk.content.includes(pattern) || 
        /[A-F0-9]{8,}/.test(chunk.content) || // Long hex sequences
        /[^\x20-\x7E]{4,}/.test(chunk.content) // Long non-printable sequences
      )
      
      if (isBinary) {
        chunksToDelete.push(chunk.id)
        console.log(`Identified binary chunk for deletion: ${chunk.id}`)
        console.log(`Content preview: ${chunk.content.substring(0, 100)}...`)
      }
    }

    if (chunksToDelete.length > 0) {
      const deleteResult = await prisma.documentChunk.deleteMany({
        where: {
          id: {
            in: chunksToDelete,
          },
        },
      })
      deletedCount = deleteResult.count
      console.log(`Deleted ${deletedCount} chunks with binary data.`)
    } else {
      console.log("No chunks with binary data found for deletion.")
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} chunks containing binary data`,
      deletedChunks: deletedCount,
    })
  } catch (error) {
    console.error("Error clearing binary data:", error)
    return NextResponse.json(
      { error: "Failed to clear binary data" },
      { status: 500 }
    )
  }
}
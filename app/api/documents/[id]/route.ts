import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastDataset } from "@/lib/events";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Get user's organization
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
    }

    const organizationId = membership.orgId;
    const { id } = await params;

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: { 
        id,
        organizationId
      },
      select: {
        id: true,
        datasetId: true,
        title: true
      }
    });

    if (!document) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    // Delete the document
    await prisma.document.delete({
      where: { id }
    });

    // Broadcast deletion event
    if (document.datasetId) {
      broadcastDataset(document.datasetId, { 
        type: "document.deleted", 
        documentId: id,
        documentName: document.title
      });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Document DELETE error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? "Failed to delete document" 
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Get user's organization
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
    }

    const organizationId = membership.orgId;
    const { id } = await params;

    // Get document details
    const document = await prisma.document.findFirst({
      where: { 
        id,
        organizationId
      },
      select: {
        id: true,
        title: true,
        status: true,
        coverage: true,
        indexedChunks: true,
        updatedAt: true,
        errorMessage: true,
        contentType: true,
        fileSize: true
      }
    });

    if (!document) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        name: document.title,
        status: document.status,
        coverage: document.coverage,
        indexedChunks: document.indexedChunks,
        updatedAt: document.updatedAt.toISOString(),
        errorMessage: document.errorMessage,
        contentType: document.contentType,
        fileSize: document.fileSize
      }
    });

  } catch (error: any) {
    console.error('Document GET error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? "Failed to fetch document" 
    }, { status: 500 });
  }
}
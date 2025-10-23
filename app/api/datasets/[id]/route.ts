import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: datasetId } = await params;

    // Get user's organization
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      include: { org: true },
    });

    if (!membership?.org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if dataset exists and belongs to user's organization
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: datasetId,
        organizationId: membership.org.id,
      },
      include: {
        documents: {
          include: {
            documentChunks: true,
          },
        },
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Delete in order: chunks -> documents -> dataset
    // This ensures foreign key constraints are respected
    for (const document of dataset.documents) {
      // Delete document chunks
      await prisma.documentChunk.deleteMany({
        where: { documentId: document.id },
      });
      
      // Delete document
      await prisma.document.delete({
        where: { id: document.id },
      });
    }

    // Delete the dataset
    await prisma.dataset.delete({
      where: { id: datasetId },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Dataset deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting dataset:", error);
    return NextResponse.json(
      { error: "Failed to delete dataset" },
      { status: 500 }
    );
  }
}
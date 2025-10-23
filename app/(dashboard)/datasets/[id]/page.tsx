import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import DatasetClient from "@/components/datasets/DatasetClient";
import { flags } from "@/lib/config";

type RouteParams = { id: string };

export default async function DatasetWorkspacePage({ 
  params 
}: { 
  params: Promise<RouteParams> 
}) {
  // Next 15: params is a Promise
  const { id } = await params;

  const ds = await prisma.dataset.findUnique({
    where: { id },
    include: {
      _count: { select: { documents: true } },
      documents: { orderBy: { updatedAt: "desc" }, take: 20 },
    },
  });
  
  if (!ds) return notFound();

  // Feature flag: Use unified workspace or fallback to original layout
  if (flags.UNIFIED_WORKSPACE) {
    return (
      <WorkspaceShell
        dataset={{
          id: ds.id,
          name: ds.name,
          purpose: "Documentation", // Default purpose since it's not in the schema
          counts: { documents: ds._count.documents },
        }}
        initialDocuments={ds.documents.map(d => ({
          id: d.id, 
          name: d.title, 
          size: Number(d.fileSize) || 0, 
          type: d.contentType?.split('/')[1]?.toUpperCase() || 'Unknown',
          status: d.status, 
          updatedAt: d.updatedAt.toISOString(),
          downloadUrl: d.filePath || '',
          indexedChunks: d.indexedChunks || 0,
        }))}
      />
    );
  }

  // Fallback to original DatasetClient layout
  return (
    <DatasetClient
        datasetId={ds.id}
        datasetName={ds.name}
      initialDocuments={ds.documents.map(d => ({
        id: d.id, 
        name: d.title, 
        size: Number(d.fileSize) || 0, 
        type: d.contentType?.split('/')[1]?.toUpperCase() || 'Unknown',
        status: d.status, 
        updatedAt: d.updatedAt.toISOString(),
        downloadUrl: d.filePath || '', // Add downloadUrl property
      }))}
      initialEvents={[]} // Empty events array for now
    />
  );
}

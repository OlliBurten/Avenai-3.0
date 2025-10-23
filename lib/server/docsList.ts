import { prisma } from "@/lib/prisma";

export async function getDocsList(
  orgId: string, 
  datasetIds?: string[]
): Promise<Array<{ 
  datasetId: string; 
  datasetName: string; 
  count: number; 
  docs: { id: string; title: string; updatedAt: Date }[] 
}>> {
  // Get all datasets for the org if no specific ones requested
  const allDatasets = await prisma.dataset.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true }
  });
  
  const targetDatasetIds = datasetIds && datasetIds.length > 0 
    ? datasetIds 
    : allDatasets.map(d => d.id);
  
  const nameById = Object.fromEntries(allDatasets.map(d => [d.id, d.name || d.id]));

  const docs = await prisma.document.findMany({
    where: {
      organizationId: orgId,
      datasetId: { in: targetDatasetIds },
      status: "COMPLETED",
    },
    select: { id: true, title: true, datasetId: true, updatedAt: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const visible = docs.filter(d => {
    const t = (d.title || "").trim();
    if (/^avenai-session-/i.test(t)) return false;
    return true;
  });

  // group
  const grouped: Record<string, { datasetName: string; docs: { id: string; title: string; updatedAt: Date }[] }> = {};
  for (const d of visible) {
    const key = d.datasetId || "default";
    if (!grouped[key]) grouped[key] = { datasetName: nameById[key] || key, docs: [] };
    grouped[key].docs.push({ id: d.id, title: d.title || `Document ${d.id.slice(0,6)}`, updatedAt: d.updatedAt });
  }

  // sort datasets by name asc; docs already newest-first by query order
  const ordered = Object
    .entries(grouped)
    .sort((a,b) => a[1].datasetName.localeCompare(b[1].datasetName))
    .map(([datasetId, v]) => ({
      datasetId,
      datasetName: v.datasetName,
      count: v.docs.length,
      docs: v.docs
    }));

  return ordered;
}

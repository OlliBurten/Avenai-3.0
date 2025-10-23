import { prisma } from '@/lib/prisma'

export async function ensureGettingStartedDataset(orgId: string, orgName: string) {
  const name = `Getting Started – ${orgName}`
  const existing = await prisma.dataset.findFirst({ where: { organizationId: orgId, name } })
  if (existing) return existing
  
  return prisma.dataset.create({ 
    data: { 
      organizationId: orgId, 
      name, 
      description: 'Your first dataset for testing Avenai.',
      type: 'DOCUMENTATION'
    } 
  })
}

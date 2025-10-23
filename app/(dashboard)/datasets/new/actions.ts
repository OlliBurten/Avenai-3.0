"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DatasetType } from "@prisma/client";

export async function createDatasetAction(form: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = (session.user as any).id;
  
  // Get user's organization
  const membership = await prisma.memberships.findFirst({
    where: { userId },
    include: { org: true },
  });

  if (!membership?.org) {
    throw new Error("No organization found");
  }

  const name = String(form.get("name") || "Untitled dataset");
  const purpose = String(form.get("purpose") || "Documentation");
  const tags = String(form.get("tags") || "");

  // Process tags - convert string to array if needed
  let tagsArray: string[] = [];
  if (tags) {
    tagsArray = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
  }

  // Map frontend type values to Prisma enum values
  const typeMapping: Record<string, string> = {
    'Documentation': 'DOCUMENTATION',
    'API': 'API_GUIDE',
    'Internal': 'REFERENCE',
  };

  const datasetType = typeMapping[purpose] || 'DOCUMENTATION';

  const ds = await prisma.dataset.create({
    data: {
      name,
      organizationId: membership.org.id,
      type: datasetType as DatasetType,
      tags: tagsArray,
      isActive: true,
    },
    select: { id: true },
  });

  redirect(`/datasets/${ds.id}`); // <-- no more "My first dataset"
}

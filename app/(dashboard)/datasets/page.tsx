import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Database, MessageSquare } from "lucide-react";
import { Icon } from "@/components/Icon";
import DatasetsSuccessToast from "@/components/DatasetsSuccessToast";
import DatasetCard from "@/components/datasets/DatasetCard";

interface Dataset {
  id: string;
  name: string;
  type: string;
  tags: string[];
  isActive: boolean;
  docCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default async function DatasetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = (session.user as any).id;

  // Get organization through membership
  const membership = await prisma.memberships.findFirst({
    where: { userId },
    include: { org: true },
  });

  if (!membership?.org) redirect("/auth/signin");

  // Check onboarding completion
  if (!membership.org.onboardingCompleted) redirect("/onboarding");

  // Get datasets for this organization
  const datasets = await prisma.dataset.findMany({
    where: { organizationId: membership.org.id },
    select: {
      id: true,
      name: true,
      type: true,
      tags: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      documents: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform datasets to include document count
  const datasetsWithCount: Dataset[] = datasets.map(dataset => ({
    id: dataset.id,
    name: dataset.name,
    type: dataset.type,
    tags: dataset.tags,
    isActive: dataset.isActive,
    docCount: dataset.documents.length,
    createdAt: dataset.createdAt,
    updatedAt: dataset.updatedAt,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <DatasetsSuccessToast />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Icon as={MessageSquare} className="h-8 w-8 text-brand-500 mr-3" />
                Copilot
              </h1>
              <p className="text-gray-600 mt-2">AI-powered assistant for your documentation and knowledge bases</p>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/datasets/new"
                className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors shadow-glow"
              >
                <Icon as={Plus} className="h-4 w-4 mr-2" />
                New Dataset
              </Link>
            </div>
          </div>
        </div>

        {/* Success Messages */}
        <div id="success-messages"></div>

        {datasetsWithCount.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <Icon as={Database} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No datasets yet</h3>
            <p className="text-gray-600 mb-6">Create your first dataset to start uploading and organizing documents.</p>
            <Link 
              href="/datasets/new"
              className="inline-flex items-center px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors shadow-glow"
            >
              <Icon as={Plus} className="h-5 w-5 mr-2" />
              Create Dataset
            </Link>
          </div>
        ) : (
          <div>
            {/* Datasets Section Header */}
            <div className="mb-6 flex items-center gap-2">
              <Icon as={Database} className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Your Datasets</h2>
              <span className="text-sm text-gray-500">({datasetsWithCount.length})</span>
            </div>
            
            {/* Datasets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasetsWithCount.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
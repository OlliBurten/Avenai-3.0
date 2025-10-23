import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SharedChatState } from '@/components/workspace';
import { Database, MessageSquare, Plus } from "lucide-react";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
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

  // Check if there are any datasets
  const datasets = await prisma.dataset.findMany({
    where: { 
      organizationId: membership.org.id,
      isActive: true 
    },
    select: {
      id: true,
      name: true,
      documents: {
        select: { id: true },
      },
    },
  });

  // If no datasets, show CTA to create one
  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="mx-auto w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="h-12 w-12 text-purple-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create a dataset first to start chatting with your docs.
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Upload PDFs, Markdown, or text files to build your AI knowledge base.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/datasets"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              <Database className="h-5 w-5 mr-2" />
              Create Dataset
            </Link>
            
            <Link 
              href="/datasets"
              className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <Database className="h-5 w-5 mr-2" />
              View All Datasets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If specific dataset requested, validate it exists
  let selectedDataset = null;
  if (resolvedSearchParams.dataset) {
    selectedDataset = datasets.find(d => d.id === resolvedSearchParams.dataset);
    if (!selectedDataset) {
      // Dataset not found, redirect to chat without dataset param
      redirect('/chat');
    }
  }

  return <SharedChatState datasetId={selectedDataset?.id || datasets[0]?.id || ''} />;
}
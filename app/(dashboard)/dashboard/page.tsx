import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from '@/components/DashboardClient';
import DashboardGate from '@/components/DashboardGate';

export default async function DashboardPage() {
  // Development bypass - skip authentication for now
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/auth/signin");

    const org = await prisma.organization.findFirst({
      where: { memberships: { some: { userId: (session.user as any).id } } },
      select: { onboardingCompleted: true },
    });

    if (!org?.onboardingCompleted) redirect("/onboarding");
  }

  return (
    <>
      <DashboardGate />
      <DashboardClient />
    </>
  );
}

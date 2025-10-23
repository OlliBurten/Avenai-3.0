import { prisma } from '@/lib/prisma'

export async function getOrg(orgId: string) {
  return prisma.organization.findUnique({ where: { id: orgId } })
}

export async function completeOnboarding(orgId: string, data: Partial<{
  onboardingUseCase: string
  onboardingSuccessGoal: string
  onboardingConsentAt: Date
}>) {
  return prisma.organization.update({
    where: { id: orgId },
    data: { 
      onboardingCompleted: true,
      onboardingUseCase: data.onboardingUseCase ?? undefined,
      onboardingSuccessGoal: data.onboardingSuccessGoal ?? undefined,
      onboardingConsentAt: data.onboardingConsentAt ?? undefined,
    }
  })
}

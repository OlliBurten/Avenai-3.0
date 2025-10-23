/**
 * Subscription Limits Utility
 * 
 * Centralized subscription tier limits and enforcement logic.
 * Used across API routes to ensure consistent limit checking.
 */

export interface SubscriptionLimits {
  documents: number
  chatSessions: number
  messages: number
  apiRequests: number
  storage: number // bytes
  datasets: number // NEW: Pilot program includes dataset limits
  users: number // NEW: Pilot program includes user limits
  price: number
}

/**
 * Get subscription limits for a given tier
 * PILOT PROGRAM: Limited spots with generous limits for validation
 * - PILOT: Exclusive program with structured limits
 * - FREE: Strict limits to force upgrades
 * - PRO: Sweet spot for growing SaaS ($99/month) - includes former Enterprise features
 * - FOUNDER: Unlimited access for founder account
 */
export function getSubscriptionLimits(tier: string): SubscriptionLimits {
  switch (tier) {
    case 'PILOT':
      return {
        documents: 60,          // 3 datasets × 20 docs each
        chatSessions: 1000,     // Generous for pilot validation
        messages: 5000,         // 5,000 queries per month
        apiRequests: 5000,      // 5,000 API requests per month
        storage: 500 * 1024 * 1024, // 500MB (generous for pilot)
        datasets: 3,            // 3 datasets maximum
        users: 5,               // 5 team members
        price: 0                // Free during pilot
      }
    case 'FREE':
      return {
        documents: 5,           // Very strict - forces quick upgrade
        chatSessions: 100,      // ~500 Q&A per month
        messages: 500,          // 500 Q&A per month
        apiRequests: 500,       // 500 API requests per month
        storage: 50 * 1024 * 1024, // 50MB (enough for testing)
        datasets: 1,            // 1 dataset only
        users: 1,               // 1 user only
        price: 0
      }
    case 'PRO':
      return {
        documents: 200,         // Moved from Enterprise - more generous
        chatSessions: 10000,    // Moved from Enterprise - ~100,000 Q&A per month
        messages: 100000,       // Moved from Enterprise - 100,000 Q&A per month
        apiRequests: 100000,    // Moved from Enterprise - 100,000 API requests per month
        storage: 10 * 1024 * 1024 * 1024, // Moved from Enterprise - 10GB
        datasets: 50,           // 50 datasets
        users: 25,              // 25 team members
        price: 99               // Kept at $99 to make it more lucrative
      }
    case 'FOUNDER':
      return {
        documents: -1,          // Unlimited
        chatSessions: -1,       // Unlimited
        messages: -1,           // Unlimited
        apiRequests: -1,        // Unlimited
        storage: -1,           // Unlimited
        datasets: -1,           // Unlimited
        users: -1,              // Unlimited
        price: 0                // Free for founder
      }
    default:
      return {
        documents: 5,
        chatSessions: 100,
        messages: 500,
        apiRequests: 500,
        storage: 50 * 1024 * 1024,
        datasets: 1,
        users: 1,
        price: 0
      }
  }
}

/**
 * Check if organization has reached a specific limit
 */
export async function checkSubscriptionLimit(
  organizationId: string,
  limitType: keyof Omit<SubscriptionLimits, 'price'>,
  prisma: any
): Promise<{ allowed: boolean; current: number; limit: number; tier: string }> {
  // Get organization subscription info
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionTier: true, subscriptionStatus: true }
  });

  // Development mode bypass - allow inactive subscriptions in development
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!organization) {
    throw new Error('Organization not found');
  }
  
  if (!isDev && organization.subscriptionStatus !== 'ACTIVE') {
    throw new Error('Subscription not active');
  }

  const limits = getSubscriptionLimits(organization.subscriptionTier);
  const limit = limits[limitType];

  // Get current usage based on limit type
  let current = 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (limitType) {
    case 'documents':
      current = await prisma.document.count({
        where: { organizationId }
      });
      break;
    
    case 'messages':
      current = await prisma.chatMessage.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      });
      break;
    
    case 'chatSessions':
      current = await prisma.chatSession.count({
        where: {
          organizationId,
          startedAt: { gte: startOfMonth }
        }
      });
      break;
    
    case 'apiRequests':
      current = await prisma.analyticsEvent.count({
        where: {
          organizationId,
          eventType: 'api_chat_request',
          createdAt: { gte: startOfMonth }
        }
      });
      break;
    
    case 'storage':
      const result = await prisma.document.aggregate({
        where: { organizationId },
        _sum: { fileSize: true }
      });
      current = Number(result._sum.fileSize || BigInt(0));
      break;
    
    case 'datasets':
      current = await prisma.dataset.count({
        where: { organizationId }
      });
      break;
    
    case 'users':
      current = await prisma.user.count({
        where: { 
          organizationId,
          role: { not: 'INVITED' } // Count only active users, not pending invites
        }
      });
      break;
  }

  // Founder accounts have unlimited access
  const isUnlimited = limit === -1;

  return {
    allowed: isUnlimited || current < limit,
    current,
    limit: isUnlimited ? -1 : limit,
    tier: organization.subscriptionTier
  };
}

/**
 * Create a limit exceeded error response
 */
export function createLimitExceededResponse(
  limitType: string,
  current: number,
  limit: number,
  tier: string
) {
  const messages = {
    documents: tier === 'PILOT' 
      ? `You've reached your pilot limit of ${limit} documents (3 datasets × 20 docs each). Contact us for extended access.`
      : `You have reached your ${limit} document limit for the ${tier} plan. Please upgrade to upload more documents.`,
    messages: tier === 'PILOT'
      ? `You've reached your pilot limit of ${limit} queries this month. Contact us for extended access.`
      : `You have reached your ${limit} message limit for the ${tier} plan this month. Please upgrade to continue chatting.`,
    chatSessions: tier === 'PILOT'
      ? `You've reached your pilot limit of ${limit} chat sessions this month. Contact us for extended access.`
      : `You have reached your ${limit} chat session limit for the ${tier} plan this month. Please upgrade to continue.`,
    apiRequests: tier === 'PILOT'
      ? `You've reached your pilot limit of ${limit} API requests this month. Contact us for extended access.`
      : `You have reached your ${limit} API request limit for the ${tier} plan this month. Please upgrade to continue.`,
    storage: tier === 'PILOT'
      ? `You've reached your pilot storage limit of ${Math.round(limit / (1024 * 1024))}MB. Contact us for extended access.`
      : `You have reached your ${Math.round(limit / (1024 * 1024 * 1024))}GB storage limit for the ${tier} plan. Please upgrade to upload more files.`,
    datasets: tier === 'PILOT'
      ? `You've reached your pilot limit of ${limit} datasets. Contact us for extended access.`
      : `You have reached your ${limit} dataset limit for the ${tier} plan. Please upgrade to create more datasets.`,
    users: tier === 'PILOT'
      ? `You've reached your pilot limit of ${limit} team members. Contact us for extended access.`
      : `You have reached your ${limit} user limit for the ${tier} plan. Please upgrade to add more team members.`
  };

  return {
    error: `${limitType} limit reached`,
    detail: messages[limitType as keyof typeof messages] || `Limit exceeded for ${limitType}`,
    limit,
    current,
    tier
  };
}

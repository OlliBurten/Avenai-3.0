// Simple analytics utility for tracking user interactions
// In production, you'd integrate with your preferred analytics service

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Only track in browser environment
  if (typeof window === 'undefined') return;
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics Event:', eventName, properties);
  }
  
  // In production, you would send to your analytics service:
  // - Google Analytics: gtag('event', eventName, properties)
  // - Mixpanel: mixpanel.track(eventName, properties)
  // - PostHog: posthog.capture(eventName, properties)
  // - Custom API: fetch('/api/analytics/track', { method: 'POST', body: JSON.stringify({ event: eventName, properties }) })
}

// Predefined event names for consistency
export const ANALYTICS_EVENTS = {
  // Onboarding events
  ONBOARDING_COMPANY_SAVED: 'onboarding_company_saved',
  ONBOARDING_GOAL_SAVED: 'onboarding_goal_saved', 
  ONBOARDING_COMPLETED: 'onboarding_completed',
  
  // Tour events
  TOUR_STARTED: 'tour_started',
  TOUR_STEP: 'tour_step',
  TOUR_COMPLETED: 'tour_completed',
  TOUR_SKIPPED: 'tour_skipped',
  
  // Core feature events
  DATASET_CREATED: 'dataset_created',
  DOC_UPLOADED: 'doc_uploaded',
  CHAT_STARTED: 'chat_started',
  
  // Authentication events
  SIGN_IN_SUCCESS: 'sign_in_success',
  SIGN_OUT: 'sign_out',
} as const;
/**
 * Intent Reflection Component
 * 
 * Shows a subtle confirmation that the copilot understood the user's intent
 * before displaying the main response.
 */

interface IntentReflectionProps {
  prompt: string;
  intent?: string;
}

export default function IntentReflection({ prompt, intent }: IntentReflectionProps) {
  if (!prompt) return null;
  
  // Truncate long prompts
  const text = prompt.length > 110 ? prompt.slice(0, 110) + "…" : prompt;
  
  // Generate reflection based on intent
  const getReflection = () => {
    if (!intent || intent === 'general') {
      return `You're asking about: "${text}"`;
    }
    
    switch (intent.toLowerCase()) {
      case 'endpoint':
      case 'api':
        return `You're asking about API endpoints: "${text}"`;
      case 'auth':
      case 'authentication':
        return `You're asking about authentication: "${text}"`;
      case 'json':
      case 'example':
        return `You're asking for examples: "${text}"`;
      case 'integration':
      case 'setup':
        return `You're asking about integration: "${text}"`;
      case 'error':
      case 'troubleshooting':
        return `You're asking about troubleshooting: "${text}"`;
      default:
        return `You're asking about: "${text}"`;
    }
  };

  return (
    <div className="text-xs text-muted-foreground italic mb-2 px-4">
      {getReflection()}
    </div>
  );
}




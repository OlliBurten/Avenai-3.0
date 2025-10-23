"use client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type FeedbackButtonsProps = {
  messageId: string;
  datasetId?: string;
  onFeedback?: (vote: 'up' | 'down') => void;
};

export function FeedbackButtons({ messageId, datasetId, onFeedback }: FeedbackButtonsProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (newVote: 'up' | 'down') => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messageId,
          datasetId,
          rating: newVote,
          messageContent: '', // Optional
          userQuery: '', // Optional
        }),
      });

      if (response.ok) {
        setVote(newVote);
        onFeedback?.(newVote);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('up')}
        disabled={isSubmitting || vote !== null}
        className={`
          inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200
          ${vote === 'up' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Helpful"
      >
        👍 Helpful
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={isSubmitting || vote !== null}
        className={`
          inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-200
          ${vote === 'down' 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Not helpful"
      >
        👎 Not helpful
      </button>
      {vote && (
        <span className="text-xs text-green-600 font-medium ml-1">
          Thanks!
        </span>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react"
import ChatMarkdown from "@/components/copilot/ChatMarkdown"
import { Button } from "@/components/ui/button"
import { Bot, User, Copy, RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react"

function normalizeMarkdown(input: string): string {
  if (!input) return "";
  let s = input.trim();
  // If the model wrapped the whole answer in ```markdown … ```
  const fenced = s.match(/^```(?:md|markdown)\s*\n([\s\S]*?)\n```$/i);
  if (fenced) s = fenced[1].trim();
  // Undo common double-escapes that make ** and ### show up literally
  s = s
    .replace(/\\\*/g, "*")
    .replace(/\\#/g, "#")
    .replace(/\\`/g, "`")
    .replace(/\r\n/g, "\n");
  return s;
}

type Props = {
  role: "assistant" | "user"
  content: string | { answers: Array<{ document: string; content: string }>; summary?: string; coverage?: string }
  messageId?: string
  datasetId?: string
  onCopy?: () => void
  onRegenerate?: () => void
  showActions?: boolean
}

function formatStructuredResponse(content: { answers: Array<{ document: string; content: string }>; summary?: string; coverage?: string }): string {
  // Handle out-of-scope responses
  if (content.coverage === 'out_of_scope') {
    return content.summary || "I don't have information about that in the uploaded documents.";
  }
  
  // Format structured answers
  const parts: string[] = [];
  
  if (content.answers && content.answers.length > 0) {
    content.answers.forEach((answer, index) => {
      parts.push(`**From Document: ${answer.document}**\n\n${answer.content}`);
    });
  }
  
  if (content.summary) {
    parts.push(`\n**Summary:**\n${content.summary}`);
  }
  
  return parts.join('\n\n---\n\n');
}

export default function MessageBubble({ role, content, messageId, datasetId, onCopy, onRegenerate, showActions = false }: Props) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldTruncate, setShouldTruncate] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const handleFeedback = async (vote: 'up' | 'down') => {
    if (!messageId) return
    
    setFeedback(vote)
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          datasetId,
          rating: vote,
          messageContent: typeof content === 'string' ? content : JSON.stringify(content),
          userQuery: '' // We don't have the user query in this component
        })
      })
    } catch (err) {
      console.error('Failed to send feedback:', err)
    }
  }
  
  // Normalize role names—different backends sometimes send "bot" or "model"
  const normalizedRole = (role || "").toLowerCase();
  const isAssistant = normalizedRole === "assistant" || normalizedRole === "bot" || normalizedRole === "model";
  
  // Convert structured content to markdown string
  const contentString = typeof content === 'string' ? content : formatStructuredResponse(content);
  const normalizedContent = normalizeMarkdown(contentString || "");

  // Check if content should be truncated (for assistant messages only)
  useEffect(() => {
    if (isAssistant && contentRef.current) {
      const height = contentRef.current.scrollHeight;
      const shouldTruncate = height > 600; // 600px threshold
      setShouldTruncate(shouldTruncate);
    }
  }, [normalizedContent, isAssistant]);
  

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-6`}>
      <div className={`flex items-start max-w-[80%] ${isAssistant ? "flex-row space-x-3" : "flex-row-reverse space-x-reverse space-x-3"}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isAssistant ? "bg-gradient-to-br from-blue-100 to-purple-100" : "bg-gradient-to-br from-blue-600 to-blue-700"
        }`}>
          {isAssistant ? (
            <Bot className="w-5 h-5 text-blue-600" />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`chat relative group rounded-2xl whitespace-normal bg-white px-4 sm:px-5 py-3 sm:py-4 border border-slate-200 shadow-sm chat-message ${
          isAssistant
            ? "text-gray-900"
            : "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
        }`}
        data-renderer={isAssistant ? "markdown" : "plain"}
        data-role={normalizedRole}>
          <div className="mx-auto w-full max-w-2xl">
            {isAssistant ? (
              <div className="text-gray-900 font-normal">
                <div 
                  ref={contentRef}
                  className={`transition-all duration-300 ${
                    shouldTruncate && !isExpanded ? 'max-h-[600px] overflow-hidden' : ''
                  }`}
                >
                  <ChatMarkdown>{normalizedContent}</ChatMarkdown>
                </div>
                {shouldTruncate && (
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Show more
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap font-medium">{contentString}</div>
            )}
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                {onCopy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCopy}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    <Copy className="h-4 w-4 text-gray-600" />
                  </Button>
                )}
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerate}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title="Regenerate response"
                    aria-label="Regenerate response"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 hover:bg-gray-100 ${feedback === 'up' ? 'bg-green-50' : ''}`}
                  onClick={() => handleFeedback('up')}
                  title="Good response"
                  aria-label="Good response"
                >
                  <ThumbsUp className={`h-4 w-4 ${feedback === 'up' ? 'text-green-600 fill-green-600' : 'text-gray-600'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 hover:bg-gray-100 ${feedback === 'down' ? 'bg-red-50' : ''}`}
                  onClick={() => handleFeedback('down')}
                  title="Poor response"
                  aria-label="Poor response"
                >
                  <ThumbsDown className={`h-4 w-4 ${feedback === 'down' ? 'text-red-600 fill-red-600' : 'text-gray-600'}`} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

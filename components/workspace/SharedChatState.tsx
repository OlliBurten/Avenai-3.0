"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Pause, Copy, ThumbsUp, ThumbsDown, Check, ArrowDown, Square, Pencil, X } from "lucide-react";
import { default as ChatMarkdown } from "@/components/copilot/ChatMarkdown";
import StructuredResponse from "@/components/copilot/StructuredResponse";
import SourceChips from "@/components/copilot/SourceChips";
import CoverageNotice from "@/components/copilot/CoverageNotice";
import { ConfidenceBadge } from "@/components/copilot/ConfidenceBadge";
import { FeedbackButtons } from "@/components/copilot/FeedbackButtons";
import IntentReflection from "@/components/copilot/IntentReflection";
import { calculateTypingDelay, pause, detectIntent } from "@/lib/humanizeResponse";

// Message type with sources and feedback
type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string | { answers: Array<{ document: string; content: string }>; summary?: string };
  sources?: { title: string; chunkIndex: number; chunkId?: string; sectionPath?: string | null; sourceParagraph: string }[];
  feedback?: "up" | "down" | null;
  isStructured?: boolean;
  metadata?: {
    coverage?: string;
    topScore?: number;
    scoreGap?: number;
    uniqueSections?: number;
    fallbackTriggered?: boolean;
    retrievalTimeMs?: number;
    generationTimeMs?: number;
    confidenceLevel?: 'high' | 'medium' | 'low';
    confidence?: number;
  };
};

// Global chat state that persists across component instances
let globalChatState: {
  messages: Message[];
  isGenerating: boolean;
  controller: AbortController | null;
} = {
  messages: [],
  isGenerating: false,
  controller: null,
};

export default function SharedChatState({ 
  datasetId, 
  supportEmail,
  showResponseMetadata = false,
  showCoverageNotices = true,
  resetTrigger
}: { 
  datasetId: string;
  supportEmail?: string;
  showResponseMetadata?: boolean;
  showCoverageNotices?: boolean;
  resetTrigger?: number;
}) {
  const [messages, setMessages] = useState<Message[]>(globalChatState.messages);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(globalChatState.isGenerating);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with global state
  useEffect(() => {
    setMessages(globalChatState.messages);
    setIsGenerating(globalChatState.isGenerating);
  }, []);

  // Clear global state when resetTrigger changes (reset chat)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      globalChatState.messages = [];
      globalChatState.isGenerating = false;
      globalChatState.controller = null;
      setMessages([]);
      setIsGenerating(false);
      setStreamingMessage("");
      setUserHasScrolled(false);
    }
  }, [resetTrigger]);

  // Update global state when local state changes
  useEffect(() => {
    globalChatState.messages = messages;
  }, [messages]);

  useEffect(() => {
    globalChatState.isGenerating = isGenerating;
  }, [isGenerating]);

  // Smart auto-scroll: only scroll if user hasn't manually scrolled up
  useEffect(() => {
    if (!userHasScrolled) {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, userHasScrolled]);

  // Additional scroll trigger when generation completes
  useEffect(() => {
    if (!isGenerating && !streamingMessage && !userHasScrolled) {
      // Small delay to ensure content is fully rendered
      setTimeout(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      }, 200);
    }
  }, [isGenerating, streamingMessage, userHasScrolled]);

  // Detect scroll position to show/hide "back to bottom" button
  useEffect(() => {
    const scrollContainer = scroller.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Show button if scrolled up more than 200px from bottom
      setShowScrollButton(distanceFromBottom > 200);
      
      // Mark that user has scrolled if they're not at the bottom
      if (distanceFromBottom > 50) {
        setUserHasScrolled(true);
      } else {
        setUserHasScrolled(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    setUserHasScrolled(false);
  };

  // Edit message functions
  const startEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setInput(typeof content === 'string' ? content : '');
    // Focus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setInput("");
  };

  const saveEdit = async () => {
    if (!input.trim()) {
      cancelEdit();
      return;
    }

    // Remove all messages from the edit point onwards
    const updatedMessages = messages.slice(0, editingIndex!);
    setMessages(updatedMessages);
    globalChatState.messages = updatedMessages;

    // Cancel edit mode
    cancelEdit();
    
    // Send the edited message directly
    const text = input.trim();
    const newMessages = [...updatedMessages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setIsGenerating(true);
    setStreamingMessage("");
    
    // Always scroll to bottom when sending edited message
    setTimeout(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      setUserHasScrolled(false);
    }, 50);
    
    // Add thinking message
    const thinkingMessage = { role: "assistant" as const, content: "Thinking..." };
    const messagesWithThinking = [...newMessages, thinkingMessage];
    setMessages(messagesWithThinking);
    
    // Cancel any existing request
    if (globalChatState.controller) {
      globalChatState.controller.abort();
    }
    
    const controller = new AbortController();
    globalChatState.controller = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          datasetId,
          messages: updatedMessages, // Send conversation history up to the edit point
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      let isStructured = false;
      let partialResponse: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.isStructured) {
                isStructured = true;
                partialResponse = parsed.response;
                setStreamingMessage(JSON.stringify(parsed.response));
              } else {
                setStreamingMessage(parsed.response || '');
              }
            } catch (e) {
              console.error('Failed to parse streaming data:', e);
            }
          }
        }
      }

      // Finalize the response
      const finalMessages = [...newMessages];
      if (isStructured && partialResponse) {
        finalMessages.push({
          role: "assistant" as const,
          content: partialResponse,
          sources: [], // Will be populated by the API
        });
      } else {
        finalMessages.push({
          role: "assistant" as const,
          content: streamingMessage,
          sources: [], // Will be populated by the API
        });
      }

      setMessages(finalMessages);
      globalChatState.messages = finalMessages;
      setStreamingMessage("");

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      if (error.name === 'AbortError') {
        // Remove the user message and "Thinking..." message when aborted
        const messagesWithoutUserMessage = newMessages.slice(0, -1); // Remove the user message
        setMessages(messagesWithoutUserMessage);
        globalChatState.messages = messagesWithoutUserMessage;
      } else {
        const errorMessage = error.message || 'Unknown error';
        const errorMessages = [...newMessages, { 
          role: "assistant" as const, 
          content: `Sorry, there was an error processing your request: ${errorMessage}\n\nPlease try again.` 
        }];
        setMessages(errorMessages);
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessage("");
      globalChatState.controller = null;
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the new height (max 6 lines, min 1 line)
    const lineHeight = 24; // Approximate line height
    const maxLines = 6;
    const minHeight = lineHeight + 8; // padding
    const maxHeight = maxLines * lineHeight + 8;
    
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  // Copy message content
  const copyMessage = async (content: string | { answers: Array<{ document: string; content: string }>; summary?: string }, index: number) => {
    try {
      let textToCopy: string;
      
      if (typeof content === 'string') {
        textToCopy = content;
      } else {
        // Convert structured response to readable text
        const parts = content.answers.map(answer => 
          `From Document: ${answer.document}\n\n${answer.content}`
        );
        if (content.summary) {
          parts.push(`\nSummary: ${content.summary}`);
        }
        textToCopy = parts.join('\n\n');
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle feedback
  const handleFeedback = async (index: number, feedback: "up" | "down") => {
    const message = messages[index];
    
    // Toggle feedback if clicking the same button
    const newFeedback = message.feedback === feedback ? null : feedback;
    
    const updatedMessages = messages.map((m, i) => 
      i === index ? { ...m, feedback: newFeedback } : m
    );
    setMessages(updatedMessages);
    
    // Send feedback to API (only if not removing feedback)
    if (newFeedback) {
      try {
        // Find the user's query (previous message)
        const userQuery = index > 0 && messages[index - 1].role === 'user' 
          ? messages[index - 1].content 
          : 'Unknown query';

        // Convert content to string for feedback
        const contentString = typeof message.content === 'string' 
          ? message.content 
          : JSON.stringify(message.content);

        const response = await fetch('/api/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId,
            messageContent: contentString,
            userQuery,
            rating: newFeedback,
            sources: message.sources || [],
            metadata: {
              timestamp: new Date().toISOString(),
              messageIndex: index,
              chunkIdsSelected: message.sources?.map(s => s.id) || [],
              intent: message.metadata?.intent || 'UNKNOWN',
              confidenceLevel: message.metadata?.confidenceLevel,
              fallbackTriggered: message.metadata?.fallbackTriggered,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Feedback saved:', data.feedbackId);
        } else {
          console.error('Failed to save feedback:', await response.text());
        }
      } catch (error) {
        console.error('Error sending feedback:', error);
      }
    }
  };

  async function send() {
    if (!input.trim() || isGenerating) return;
    const text = input.trim();
    
    console.log('SharedChatState send function:', { 
      input, 
      text,
      hasLineBreaks: input.includes('\n'),
      lineBreakCount: (input.match(/\n/g) || []).length,
      inputLength: input.length
    });
    
    setLastUserMessage(text); // Track for feedback
    const newMessages = [...messages, { role: "user" as const, content: text }];
    
    console.log('SharedChatState user message created:', { 
      content: text,
      hasLineBreaks: text.includes('\n'),
      lineBreakCount: (text.match(/\n/g) || []).length
    });
    
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);
    setStreamingMessage("");
    
    // Always scroll to bottom when sending a message
    setTimeout(() => {
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      setUserHasScrolled(false);
    }, 50);
    
    // Add thinking message
    const thinkingMessage = { role: "assistant" as const, content: "Thinking..." };
    const messagesWithThinking = [...newMessages, thinkingMessage];
    setMessages(messagesWithThinking);
    
    // Cancel any existing request
    if (globalChatState.controller) {
      globalChatState.controller.abort();
    }
    
    const controller = new AbortController();
    globalChatState.controller = controller;
    
    // Set a timeout to prevent infinite "Thinking..."
    const timeoutId = setTimeout(() => {
      console.error('Request timeout - aborting');
      controller.abort();
    }, 60000); // 60 second timeout
    
    try {
      console.log('Sending message:', { text: text.substring(0, 50), datasetId });
      
      const response = await fetch(`/api/chat?datasetId=${datasetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          supportEmail: supportEmail || undefined
        }),
        signal: controller.signal,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response received:', { 
        hasResponse: !!data.response, 
        sourceCount: data.sources?.length || 0,
        isStructured: data.isStructured,
        fallbackUsed: data.fallbackUsed,
        metadata: data.response?.metadata,
        responsePreview: typeof data.response === 'string' 
          ? data.response.substring(0, 100)
          : 'Structured JSON response',
        responseLength: typeof data.response === 'string' ? data.response.length : 'N/A'
      });
      
      const fullResponse = data.response || 'No response';
      const sources = data.sources || [];
      const isStructured = data.isStructured || false;
      const fallbackUsed = data.fallbackUsed || false;
      const responseMetadata = {
        ...(data.metadata || (typeof fullResponse === 'object' ? fullResponse.metadata : null)),
        // Always prefer server's confidenceLevel if present
        confidenceLevel: data.confidenceLevel || data.metadata?.confidenceLevel,
        confidence: data.confidence || data.metadata?.confidence
      };
      
      // Debug: Log metadata to verify confidenceLevel is present
      console.log('📊 Raw API response data:', {
        confidenceLevel: data.confidenceLevel,
        confidence: data.confidence,
        metadataConfidenceLevel: data.metadata?.confidenceLevel,
        metadataConfidence: data.metadata?.confidence
      });
      console.log('📊 Response metadata:', {
        confidenceLevel: responseMetadata.confidenceLevel,
        confidence: responseMetadata.confidence,
        hasDataConfidenceLevel: !!data.confidenceLevel,
        hasMetadataConfidenceLevel: !!data.metadata?.confidenceLevel
      });
      
      // Debug: Log the actual response content
      if (typeof fullResponse === 'string') {
        console.log('Full response content:', fullResponse.substring(0, 200));
        
        // Debug: Check if we got a fallback response
        if (fullResponse.includes("I'm having trouble generating a complete answer")) {
          console.warn('Received fallback response - LLM generation likely failed on server');
        } else {
          console.log('Got proper LLM response, not fallback');
        }
      } else {
        console.log('Structured response:', fullResponse);
      }
      
      clearTimeout(timeoutId);
      
      if (isStructured) {
        // For structured responses, animate each section
        const structuredData = fullResponse as { answers: Array<{ document: string; content: string }>; summary?: string };
        
        // Build up the response progressively
        for (let answerIndex = 0; answerIndex < structuredData.answers.length; answerIndex++) {
          const answer = structuredData.answers[answerIndex];
          const words = answer.content.split(' ');
          let currentText = "";
          
          for (let i = 0; i < words.length; i++) {
            if (controller.signal.aborted) break;
            
            currentText += (i === 0 ? '' : ' ') + words[i];
            
            // Build partial structured response
            const partialAnswers = [
              ...structuredData.answers.slice(0, answerIndex),
              { document: answer.document, content: currentText },
            ];
            
            const partialResponse = {
              answers: partialAnswers,
              summary: answerIndex === structuredData.answers.length - 1 && i === words.length - 1 
                ? structuredData.summary 
                : undefined
            };
            
            setStreamingMessage('streaming');
            const streamingMessages = [...newMessages, { 
              role: "assistant" as const, 
              content: partialResponse,
              isStructured: true 
            }];
            setMessages(streamingMessages);
            
            // Small delay between words for typing effect
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        
        // Final complete message with sources and metadata
        const finalMessages = [...newMessages, { 
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: "assistant" as const, 
          content: fullResponse, 
          sources,
          isStructured: true,
          metadata: responseMetadata
        }];
        console.log('🎯 Setting structured messages:', {
          messageCount: finalMessages.length,
          isStructured: true
        });
        
        // Add Colleague Mode typing delay for structured responses
        const typingDelay = calculateTypingDelay(fullResponse.length);
        console.log('🎭 Adding typing delay:', typingDelay, 'ms');
        await pause(typingDelay);
        
        setMessages(finalMessages);
      } else {
        // For markdown responses, use typing animation
        let currentText = "";
        const words = fullResponse.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          if (controller.signal.aborted) break;
          
          currentText += (i === 0 ? '' : ' ') + words[i];
          setStreamingMessage(currentText);
          
          // Update messages with streaming content
          const streamingMessages = [...newMessages, { role: "assistant" as const, content: currentText }];
          setMessages(streamingMessages);
          
          // Small delay between words for typing effect
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        // Final message with sources and metadata
        const finalMessages = [...newMessages, { 
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: "assistant" as const, 
          content: fullResponse, 
          sources,
          metadata: responseMetadata
        }];
        console.log('🎯 Setting final messages:', {
          messageCount: finalMessages.length,
          lastMessageContent: finalMessages[finalMessages.length - 1].content.substring(0, 100)
        });
        
        // Add Colleague Mode typing delay for markdown responses
        const typingDelay = calculateTypingDelay(fullResponse.length);
        console.log('🎭 Adding typing delay:', typingDelay, 'ms');
        await pause(typingDelay);
        
        setMessages(finalMessages);
      }
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Chat error:', error);
      
      if (error.name === 'AbortError') {
        console.log('Request aborted by user or timeout');
        // Remove the user message and "Thinking..." message when aborted
        const messagesWithoutUserMessage = newMessages.slice(0, -1); // Remove the user message
        setMessages(messagesWithoutUserMessage);
        globalChatState.messages = messagesWithoutUserMessage;
      } else {
        const errorMessage = error.message || 'Unknown error';
        const errorMessages = [...newMessages, { 
          role: "assistant" as const, 
          content: `Sorry, there was an error processing your request: ${errorMessage}\n\nPlease try again.` 
        }];
        setMessages(errorMessages);
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessage("");
      globalChatState.controller = null;
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={scroller} className="flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-zinc-300 mx-auto">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 mb-2">Start a conversation</h3>
            <p className="text-zinc-500 max-w-sm">Ask questions about your dataset to test your copilot's intelligence and see how it responds.</p>
          </div>
        ) : (
          <div className="pt-4 pb-6">
            {messages.map((m, i) => (
          <div key={i} className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"} ${i > 0 ? "mt-1" : ""} border-0 ${m.role === "user" ? "group" : ""}`}>
            <div className={`max-w-3xl w-full ${m.role === "user" ? "mb-1" : ""}`}>
              <div className={`text-sm text-zinc-500 mb-4 ${m.role === "user" ? "text-right" : ""}`}>
                {m.role === "user" ? "You" : ""}
              </div>
              <div
                className={[
                  "leading-relaxed text-[15px] chat",
                  m.role === "user"
                    ? "rounded-2xl px-4 py-3 bg-brand-100 text-brand-900 shadow-sm"
                    : "text-charcoal",
                  // Add subtle fade-in animation for assistant messages during typing
                  m.role === "assistant" && i === messages.length - 1 && isGenerating
                    ? "typing-fade-in"
                    : "",
                ].join(" ")}
              >
                {m.role === "user" ? (
                  <div className="group relative">
                    <p className="m-0">{typeof m.content === 'string' ? m.content : ''}</p>
                  </div>
                ) : m.content === "Thinking..." ? (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Confidence Badge and Fallback Notice - show for assistant messages */}
                    {m.role === "assistant" && m.metadata && (
                      <div className="flex items-center justify-between pb-2 mb-2">
                        <ConfidenceBadge
                          topScore={m.metadata.topScore ?? 0}
                          scoreGap={m.metadata.scoreGap ?? 0}
                          uniqueSections={m.metadata.uniqueSections ?? 0}
                          confidenceLevel={m.metadata.confidenceLevel}
                        />
                        {m.metadata.fallbackTriggered && (
                          <span className="text-xs text-neutral-500 italic">
                            Expanded search triggered for better coverage.
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Intent Reflection - show for first assistant message after user message */}
                    {m.role === "assistant" && i > 0 && messages[i - 1]?.role === "user" && (() => {
                      const prevContent = messages[i - 1]?.content;
                      const promptText = typeof prevContent === 'string' ? prevContent : "";
                      return (
                        <IntentReflection 
                          prompt={promptText} 
                          intent={detectIntent(promptText)}
                        />
                      );
                    })()}
                    
                    {/* Coverage Notice - show for assistant messages with coverage issues */}
                    {m.role === "assistant" && typeof m.content === 'object' && 'metadata' in m.content && m.content.metadata && (
                      <CoverageNotice 
                        metadata={m.content.metadata} 
                        showCoverageNotices={showCoverageNotices}
                      />
                    )}
                    
                    {typeof m.content === 'string' ? (
                      <ChatMarkdown>{m.content}</ChatMarkdown>
                    ) : (
                      <StructuredResponse response={m.content} />
                    )}
                    <SourceChips sources={m.sources || m.metadata?.sources} datasetId={datasetId} />
                    
                    {/* Debug metadata - show when debug mode is enabled */}
                    {showResponseMetadata && m.role === "assistant" && m.metadata && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 border">
                        <div className="font-semibold mb-1">Debug Info:</div>
                        <div>Confidence: {m.metadata.confidenceLevel || 'unknown'}</div>
                        <div>Top Score: {m.metadata.topScore?.toFixed(3) || 'N/A'}</div>
                        <div>Score Gap: {m.metadata.scoreGap?.toFixed(3) || 'N/A'}</div>
                        <div>Unique Sections: {m.metadata.uniqueSections || 0}</div>
                        <div>Retrieval Time: {m.metadata.retrievalTimeMs || 'N/A'}ms</div>
                        <div>Generation Time: {m.metadata.generationTimeMs || 'N/A'}ms</div>
                        {m.metadata.fallbackTriggered && <div className="text-orange-600">⚠ Fallback triggered</div>}
                      </div>
                    )}
                    
                    {/* Response metadata badge - show in development OR if explicitly enabled */}
                    {(process.env.NODE_ENV === 'development' || showResponseMetadata) && typeof m.content === 'object' && 'metadata' in m.content && m.content.metadata && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-green-50 text-green-700 border border-green-200">
                        {(m.content.metadata as any).usedStructured ? '✓ JSON' : '⚠ Fallback'}
                        {(m.content.metadata as any).retryForJson && ' (retry)'}
                      </div>
                    )}
                    
                    {/* Action buttons for assistant messages */}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => copyMessage(m.content, i)}
                        className="inline-flex items-center justify-center p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                        title={copiedIndex === i ? "Copied!" : "Copy response"}
                      >
                        {copiedIndex === i ? (
                          <Check size={13} />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      
                      {/* Feedback Buttons Component */}
                      <FeedbackButtons
                        messageId={m.id || `msg_${i}`}
                        datasetId={datasetId}
                      />
                    </div>
                  </>
                )}
              </div>
              
              {/* Action buttons for user messages - positioned below the bubble, right-aligned */}
              {m.role === "user" && editingIndex !== i && (
                <div className="group-hover:opacity-100 opacity-0 flex items-center gap-0.5 mt-3 justify-end transition-opacity">
                  <button
                    onClick={() => copyMessage(m.content, i)}
                    className="inline-flex items-center justify-center p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                    title={copiedIndex === i ? "Copied!" : "Copy message"}
                  >
                    {copiedIndex === i ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(i, m.content as string)}
                    className="inline-flex items-center justify-center p-0.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                    title="Edit message"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-white border border-zinc-300 shadow-lg hover:bg-zinc-50 transition-all duration-200"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={16} className="text-zinc-600" />
        </button>
      )}

      <div className="sticky bottom-0 border-t bg-white px-4 pt-4 pb-3">
        <div className="mx-auto max-w-3xl">
          {/* Edit Banner - Small floating strip */}
          {editingIndex !== null && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Pencil size={12} className="text-zinc-600" />
                <span className="text-xs font-medium text-zinc-700">Edit</span>
              </div>
              <button
                onClick={cancelEdit}
                className="p-0.5 hover:bg-zinc-200 rounded transition-colors"
                title="Cancel edit"
              >
                <X size={12} className="text-zinc-600" />
              </button>
            </div>
          )}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                console.log('SharedChatState textarea onChange:', { 
                  originalValue: e.target.value, 
                  hasLineBreaks: e.target.value.includes('\n'),
                  lineBreakCount: (e.target.value.match(/\n/g) || []).length
                });
                setInput(e.target.value);
              }}
              onPaste={(e) => {
                console.log('SharedChatState textarea onPaste:', { 
                  clipboardData: e.clipboardData.getData('text'),
                  hasLineBreaks: e.clipboardData.getData('text').includes('\n')
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editingIndex !== null) {
                    saveEdit();
                  } else {
                    send();
                  }
                }
                if (e.key === "Escape" && isGenerating) {
                  globalChatState.controller?.abort();
                  setIsGenerating(false);
                }
                if (e.key === "Escape" && editingIndex !== null) {
                  cancelEdit();
                }
              }}
              placeholder="Ask about your dataset..."
              rows={1}
              className="w-full resize-none rounded-xl border border-zinc-300 bg-white pl-3 pr-12 py-2 text-[15px] leading-6 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 min-h-[44px] max-h-[152px] overflow-y-auto"
              disabled={isGenerating}
            />
            {isGenerating ? (
              <button
                onClick={() => {
                  globalChatState.controller?.abort();
                  setIsGenerating(false);
                }}
                className="absolute right-2 top-2 h-7 w-7 grid place-items-center rounded-full transition-all duration-200 bg-zinc-600 hover:bg-zinc-700 shadow-sm text-white"
                aria-label="Stop generating"
              >
                <Square size={10} fill="white" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className={`absolute right-2 top-2 h-7 w-7 grid place-items-center rounded-full transition-all duration-200 ${
                  input.trim()
                    ? "bg-brand-500 hover:bg-brand-600 shadow-sm"
                    : "bg-zinc-300 cursor-not-allowed"
                } text-white`}
                aria-label="Send message"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

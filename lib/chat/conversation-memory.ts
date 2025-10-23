// lib/chat/conversation-memory.ts
// Conversation memory system for multi-turn dialogues
// Tracks chat history and maintains context across messages

import { prisma } from '@/lib/prisma';

export interface ConversationMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  sessionId: string;
  messages: ConversationMessage[];
  summary?: string;
  lastActivity: Date;
}

/**
 * Conversation Manager
 * Handles loading, storing, and managing chat conversation history
 */
export class ConversationManager {
  /**
   * Get or create a chat session
   */
  async getOrCreateSession(
    organizationId: string,
    userIdentifier: string,
    datasetId?: string
  ): Promise<{ sessionId: string; sessionDbId: string; isNew: boolean }> {
    try {
      // Find recent session (within last 24 hours)
      const recentSession = await prisma.chatSession.findFirst({
        where: {
          organizationId,
          userIdentifier,
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { lastActivityAt: 'desc' }
      });

      if (recentSession) {
        // Update last activity
        await prisma.chatSession.update({
          where: { id: recentSession.id },
          data: { lastActivityAt: new Date() }
        });

        return {
          sessionId: recentSession.sessionId,
          sessionDbId: recentSession.id,  // ← Return DB ID for message relations
          isNew: false
        };
      }

      // Create new session
      const newSession = await prisma.chatSession.create({
        data: {
          organizationId,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userIdentifier,
          context: { datasetId: datasetId || null },
          startedAt: new Date(),
          lastActivityAt: new Date()
        }
      });

      return {
        sessionId: newSession.sessionId,
        sessionDbId: newSession.id,  // ← Return DB ID for message relations
        isNew: true
      };
    } catch (error) {
      console.error('Error getting/creating session:', error);
      // Fallback: generate temporary session ID
      return {
        sessionId: `temp_${Date.now()}`,
        sessionDbId: `temp_${Date.now()}`,
        isNew: true
      };
    }
  }

  /**
   * Load conversation history
   * Gets last N message exchanges (user + assistant pairs)
   */
  async getConversationHistory(
    sessionDbId: string,
    lastN: number = 5
  ): Promise<ConversationMessage[]> {
    try {
      console.log('🔍 Loading conversation history:', { sessionDbId: sessionDbId.substring(0, 20), lastN });
      
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: sessionDbId }, // Use sessionDbId (database ID) to match what's saved
        orderBy: { createdAt: 'desc' },
        take: lastN * 2, // Get last N exchanges (each exchange = user + assistant)
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          metadata: true
        }
      });

      console.log('📦 Retrieved messages:', { count: messages.length, messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) })) });

      // Reverse to get chronological order (oldest first)
      return messages.reverse().map(msg => ({
        id: msg.id,
        role: msg.role as 'USER' | 'ASSISTANT',
        content: msg.content,
        createdAt: msg.createdAt,
        metadata: msg.metadata as Record<string, any>
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  /**
   * Add a message to conversation history
   */
  async addMessage(
    sessionDbId: string, // This is the database ID (ChatSession.id), not the string sessionId
    organizationId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('💾 Saving message:', { sessionDbId: sessionDbId.substring(0, 20), role, contentLength: content.length });
      
      await prisma.chatMessage.create({
        data: {
          sessionId: sessionDbId, // Foreign key to ChatSession.id
          organizationId,
          role,
          content,
          metadata: metadata || {},
          createdAt: new Date()
        }
      });

      // Update session last activity (use id field, not sessionId string field)
      await prisma.chatSession.update({
        where: { id: sessionDbId },
        data: { lastActivityAt: new Date() }
      });
      
      console.log('✅ Message saved successfully');
    } catch (error) {
      console.error('Error adding message:', error);
      // Don't throw - conversation can continue even if history fails to save
    }
  }

  /**
   * Build conversation context for LLM
   * Formats history into a string that captures conversation flow
   */
  buildConversationContext(
    history: ConversationMessage[],
    currentQuery: string
  ): string {
    if (history.length === 0) {
      return currentQuery;
    }

    // Take last 5 exchanges (10 messages)
    const recentHistory = history.slice(-10);
    
    // Format as conversation
    const conversationText = recentHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    return `Previous conversation:\n${conversationText}\n\nCurrent question: ${currentQuery}`;
  }

  /**
   * Build OpenAI-formatted messages array
   * Converts conversation history to OpenAI chat messages format
   */
  buildOpenAIMessages(
    history: ConversationMessage[],
    systemPrompt: string,
    currentQuery: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 messages to stay within token limits)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role.toLowerCase(), // 'USER' -> 'user', 'ASSISTANT' -> 'assistant'
        content: msg.content
      });
    });

    // Add current query
    messages.push({
      role: 'user',
      content: currentQuery
    });

    return messages;
  }

  /**
   * Summarize long conversations to save tokens
   * When conversation gets too long, summarize earlier messages
   */
  async summarizeConversation(
    sessionId: string,
    messages: ConversationMessage[]
  ): Promise<string> {
    if (messages.length < 10) {
      return ''; // No need to summarize short conversations
    }

    // In production, you'd use GPT to summarize
    // For now, return a simple summary
    const topics = new Set<string>();
    messages.forEach(msg => {
      // Extract key topics (simple keyword extraction)
      const keywords = msg.content
        .toLowerCase()
        .match(/\b(authentication|authorization|api|endpoint|error|configuration|setup|integration)\b/gi);
      keywords?.forEach(k => topics.add(k));
    });

    return `Previous conversation covered: ${Array.from(topics).join(', ')}`;
  }

  /**
   * Clear old conversations (cleanup job)
   * Remove conversations older than 30 days
   */
  async cleanupOldConversations(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await prisma.chatSession.deleteMany({
        where: {
          lastActivityAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${result.count} old conversations`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      return 0;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(organizationId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    activeSessions: number;
  }> {
    try {
      const [sessions, messages, activeSessions] = await Promise.all([
        prisma.chatSession.count({
          where: { organizationId }
        }),
        prisma.chatMessage.count({
          where: { organizationId }
        }),
        prisma.chatSession.count({
          where: {
            organizationId,
            lastActivityAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Active in last 24h
            }
          }
        })
      ]);

      return {
        totalSessions: sessions,
        totalMessages: messages,
        avgMessagesPerSession: sessions > 0 ? Math.round(messages / sessions) : 0,
        activeSessions
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0,
        activeSessions: 0
      };
    }
  }
}

/**
 * Singleton instance
 */
export const conversationManager = new ConversationManager();


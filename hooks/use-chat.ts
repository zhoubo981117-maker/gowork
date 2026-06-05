/**
 * 聊天消息管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, AIPersona } from '@/lib/db/types';
import { addChatMessage, getChatMessages, clearChatMessages } from '@/lib/db/database';

export function useChat(jobId: string, aiPersona: AIPersona) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载聊天消息
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getChatMessages(jobId, aiPersona);
      setMessages(data);
      setError(null);
    } catch (err) {
      console.error('[useChat] Error loading messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId, aiPersona]);

  // 延迟初始加载
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMessages();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadMessages]);

  // 发送消息
  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'assistant' = 'user') => {
      try {
        const newMessage = await addChatMessage(
          jobId,
          aiPersona,
          role,
          content
        );
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        console.error('[useChat] Error sending message:', error);
        setError(error);
        throw error;
      }
    },
    [jobId, aiPersona]
  );

  // 清空聊天记录
  const clearMessages = useCallback(async () => {
    try {
      await clearChatMessages(jobId, aiPersona);
      setMessages([]);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear messages');
      console.error('[useChat] Error clearing messages:', error);
      setError(error);
      throw error;
    }
  }, [jobId, aiPersona]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadMessages,
    addChatMessage: sendMessage,
  };
}

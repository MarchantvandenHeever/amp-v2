import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface JourneySuggestion {
  title: string;
  description: string;
  type: string;
  contributes_to: string[];
  rationale: string;
  weight: number;
  duration: string;
  mandatory: boolean;
  behavioural_objective?: string;
  intended_signal?: string;
  linked_milestone?: string;
}

interface BuilderResponse {
  content: string;
  suggestions: {
    suggestions: JourneySuggestion[];
    overall_rationale: string;
  } | null;
}

export function useAIAgent(agentType: 'builder' | 'support') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<JourneySuggestion[]>([]);
  const [overallRationale, setOverallRationale] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);

  const startConversation = useCallback(async (userId: string, initiativeId?: string, journeyId?: string) => {
    const { data, error } = await supabase.from('agent_conversations').insert({
      user_id: userId,
      initiative_id: initiativeId || null,
      journey_id: journeyId || null,
      context_type: agentType,
      status: 'active',
    }).select().single();

    if (!error && data) {
      setConversationId(data.id);
      return data.id;
    }
    return null;
  }, [agentType]);

  const sendMessage = useCallback(async (
    input: string,
    context?: Record<string, any>
  ) => {
    const userMsg: Message = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    try {
      const functionName = agentType === 'builder' ? 'ai-journey-builder' : 'ai-support-agent';
      const body: Record<string, any> = {
        messages: allMessages,
        conversation_id: conversationId,
      };

      if (agentType === 'builder') {
        body.initiative_id = context?.initiative_id;
        body.journey_id = context?.journey_id;
        body.personas = context?.personas;
        body.milestones = context?.milestones;
        body.existing_items = context?.existing_items;
      } else {
        body.user_context = context;
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      const response = data as BuilderResponse;
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.content || (response.suggestions ? 'Here are my suggestions:' : 'I processed your request.'),
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (response.suggestions) {
        setSuggestions(response.suggestions.suggestions || []);
        setOverallRationale(response.suggestions.overall_rationale || '');
      }

      return response;
    } catch (err) {
      console.error('AI agent error:', err);
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, conversationId, agentType]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setOverallRationale('');
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setOverallRationale('');
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    suggestions,
    overallRationale,
    conversationId,
    sendMessage,
    startConversation,
    clearSuggestions,
    resetChat,
  };
}

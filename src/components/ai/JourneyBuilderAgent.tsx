import React, { useState, useRef, useEffect } from 'react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Send, Loader2, Plus, Check, X, Sparkles, Target, Star, Upload, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const pillarColors: Record<string, string> = {
  participation: 'bg-amp-participation text-primary-foreground',
  ownership: 'bg-amp-ownership text-primary-foreground',
  confidence: 'bg-amp-confidence text-accent-foreground',
};

const typeIcons: Record<string, React.ElementType> = {
  content: FileText, activity: CheckCircle2, form: MessageSquare,
  confidence_check: Star, evidence_upload: Upload, reflection: MessageSquare, scenario: Target,
};

interface Props {
  journeyId: string;
  initiativeId?: string;
  existingItems: any[];
  onItemInserted: () => void;
  onClose: () => void;
}

export const JourneyBuilderAgent: React.FC<Props> = ({
  journeyId, initiativeId, existingItems, onItemInserted, onClose
}) => {
  const { user } = useAuth();
  const { messages, isLoading, suggestions, overallRationale, sendMessage, startConversation, clearSuggestions } = useAIAgent('builder');
  const [input, setInput] = useState('');
  const [insertingIdx, setInsertingIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      startConversation(user.id, initiativeId, journeyId);
    }
  }, [user, initiativeId, journeyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text, {
      initiative_id: initiativeId,
      journey_id: journeyId,
      existing_items: existingItems,
      personas: [],
      milestones: [],
    });
  };

  const handleInsertItem = async (suggestion: any, idx: number) => {
    setInsertingIdx(idx);
    try {
      const { error } = await supabase.from('journey_items').insert({
        journey_id: journeyId,
        title: suggestion.title,
        description: suggestion.description,
        type: suggestion.type,
        contributes_to: suggestion.contributes_to,
        weight: suggestion.weight || 10,
        duration: suggestion.duration || '5 min',
        mandatory: suggestion.mandatory ?? true,
        order_index: existingItems.length + idx,
        status: 'available',
      });
      if (error) throw error;
      toast.success(`"${suggestion.title}" added to journey`);
      onItemInserted();
    } catch {
      toast.error('Failed to insert item');
    } finally {
      setInsertingIdx(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg amp-gradient-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Journey Builder Agent</h3>
            <p className="text-[10px] text-muted-foreground">AI-powered journey design</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Describe what you need and I'll suggest journey items mapped to Participation, Ownership, and Confidence.</p>
            <div className="mt-4 space-y-2">
              {[
                "Generate a starter journey for new users",
                "Add confidence checks and evidence tasks",
                "Suggest nudges for disengaged personas",
              ].map((prompt, i) => (
                <button key={i} onClick={() => { setInput(prompt); }}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm",
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            )}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions panel */}
      {suggestions.length > 0 && (
        <div className="border-t border-border max-h-[40%] overflow-y-auto">
          <div className="px-4 py-2 bg-secondary/50">
            <p className="text-xs font-medium text-muted-foreground">{overallRationale}</p>
          </div>
          <div className="px-4 py-2 space-y-2">
            {suggestions.map((s, i) => {
              const Icon = typeIcons[s.type] || Target;
              return (
                <div key={i} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{s.title}</span>
                        {s.contributes_to.map(c => (
                          <span key={c} className={`text-[9px] px-1 py-0.5 rounded-full ${pillarColors[c] || 'bg-secondary'}`}>{c[0].toUpperCase()}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      <p className="text-[10px] text-primary mt-1 italic">{s.rationale}</p>
                    </div>
                    <button
                      onClick={() => handleInsertItem(s, i)}
                      disabled={insertingIdx === i}
                      className="shrink-0 p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {insertingIdx === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Describe what you need..."
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

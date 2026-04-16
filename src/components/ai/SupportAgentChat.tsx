import React, { useState, useRef, useEffect } from 'react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Send, Loader2, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export const SupportAgentChat: React.FC = () => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, startConversation, resetChat } = useAIAgent('support');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [convStarted, setConvStarted] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpen = async () => {
    setOpen(true);
    if (!convStarted && user) {
      await startConversation(user.id);
      setConvStarted(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text, {
      user_id: user?.id,
      user_name: user?.name,
      persona: user?.persona,
      team: user?.team,
      scores: user?.scores,
      journey_items: [],
    });
  };

  if (user?.role !== 'end_user') return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full amp-gradient-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full amp-gradient-primary flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AMP Support</h3>
                <p className="text-[10px] text-muted-foreground">Your adoption journey assistant</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">Hi {user?.name?.split(' ')[0]}! 👋</p>
                <p className="text-xs text-muted-foreground mt-1">I can help you with your adoption journey. Ask me anything!</p>
                <div className="mt-4 space-y-2">
                  {[
                    "What should I do next?",
                    "Why does this change matter?",
                    "How do I complete my tasks?",
                  ].map((prompt, i) => (
                    <button key={i} onClick={() => setInput(prompt)}
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

          {/* Input */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
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
      )}
    </>
  );
};

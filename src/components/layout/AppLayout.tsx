import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import { SupportAgentChat } from '@/components/ai/SupportAgentChat';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              {user?.role === 'end_user' ? 'Acme Corporation' : 'Acme Corporation — Microsoft Copilot Adoption'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amp-risk rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-semibold">
                {user?.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
      <SupportAgentChat />
    </div>
  );
};

import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserRole = 'super_admin' | 'change_manager' | 'team_lead' | 'end_user';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  team?: string;
  persona?: string;
  scores: {
    participation: number;
    ownership: number;
    confidence: number;
    adoption: number;
  };
  streak: number;
  points: number;
  badges: string[];
  riskFlags?: string[];
  profile?: string;
}

interface AuthContextType {
  user: DemoUser | null;
  login: (profileId: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  isAuthenticated: false,
  loading: false,
});

export const useAuth = () => useContext(AuthContext);

async function fetchDemoUser(profileId: string): Promise<DemoUser> {
  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error || !profile) throw error;

  // Fetch scores
  const { data: scores } = await supabase
    .from('scores')
    .select('participation, ownership, confidence, adoption')
    .eq('user_id', profileId)
    .limit(1)
    .maybeSingle();

  // Fetch badges
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badges(name)')
    .eq('user_id', profileId);

  // Fetch risk flags
  const { data: risks } = await supabase
    .from('risk_flags')
    .select('type')
    .eq('user_id', profileId)
    .eq('resolved', false);

  return {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    role: profile.role as UserRole,
    team: profile.team || undefined,
    persona: profile.persona || undefined,
    scores: {
      participation: Number(scores?.participation || 0),
      ownership: Number(scores?.ownership || 0),
      confidence: Number(scores?.confidence || 0),
      adoption: Number(scores?.adoption || 0),
    },
    streak: profile.streak || 0,
    points: profile.points || 0,
    badges: (userBadges || []).map((ub: any) => ub.badges?.name).filter(Boolean),
    riskFlags: (risks || []).map(r => r.type),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (profileId: string) => {
    setLoading(true);
    try {
      const demoUser = await fetchDemoUser(profileId);
      setUser(demoUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const refreshed = await fetchDemoUser(user.id);
      setUser(refreshed);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [user]);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'super_admin': return '/admin';
    case 'change_manager': return '/manage';
    case 'team_lead': return '/team';
    case 'end_user': return '/dashboard';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'change_manager': return 'Change Manager';
    case 'team_lead': return 'Team Lead';
    case 'end_user': return 'End User';
  }
}

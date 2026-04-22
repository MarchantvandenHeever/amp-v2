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

  // Fetch live scores written by score-recalc edge function.
  // Use the dashboard fields (already multiplied by time-progress p) per AMP model:
  //   Pillar_dashboard = PillarScore100 * p
  //   A_dashboard      = AdoptionScore100 * p
  const { data: scoreRows } = await supabase
    .from('scores')
    .select('participation, ownership, confidence, adoption, participation_dashboard, ownership_dashboard, confidence_dashboard, adoption_dashboard')
    .eq('user_id', profileId);

  const avg = (rows: any[] | null, key: string) =>
    rows && rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + Number(r[key] || 0), 0) / rows.length)
      : 0;

  const averagedScores = {
    // Surfaced to UI as the dashboard (time-progress weighted) values per AMP doc.
    participation: avg(scoreRows, 'participation_dashboard'),
    ownership: avg(scoreRows, 'ownership_dashboard'),
    confidence: avg(scoreRows, 'confidence_dashboard'),
    adoption: avg(scoreRows, 'adoption_dashboard'),
  };

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
    scores: averagedScores,
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

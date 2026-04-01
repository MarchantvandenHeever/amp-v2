import React, { createContext, useContext, useState, useCallback } from 'react';
import { DemoUser, demoUsers, UserRole } from '@/data/mockData';

interface AuthContextType {
  user: DemoUser | null;
  login: (userId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoUser | null>(null);

  const login = useCallback((userId: string) => {
    const found = demoUsers.find(u => u.id === userId);
    if (found) setUser(found);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleLabel } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, Target, Route, FileText, Bell, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Megaphone, Shield,
  UserCog, Building2, Milestone, Award, Gauge, Trophy, Brain, Sparkles, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ampLogo from '@/assets/amp-logo-colour.jpg';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navByRole: Record<string, NavItem[]> = {
  super_admin: [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Customers', path: '/admin/customers', icon: Building2 },
    { label: 'Users', path: '/admin/users', icon: UserCog },
    { label: 'Scoring Config', path: '/admin/scoring', icon: Gauge },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
  change_manager: [
    { label: 'Dashboard', path: '/manage', icon: LayoutDashboard },
    { label: 'Initiatives', path: '/manage/initiatives', icon: Target },
    { label: 'Journeys', path: '/manage/journeys', icon: Route },
    { label: 'Users & Teams', path: '/manage/users', icon: Users },
    { label: 'Content', path: '/manage/content', icon: FileText },
    { label: 'Announcements', path: '/manage/announcements', icon: Megaphone },
    { label: 'Analytics', path: '/manage/analytics', icon: BarChart3 },
    { label: 'Risk & Insights', path: '/manage/risk', icon: Shield },
    { label: 'Insight Console', path: '/manage/insights', icon: Brain },
    { label: 'AI Recommendations', path: '/manage/recommendations', icon: Sparkles },
    { label: 'AI Change Log', path: '/manage/ai-changelog', icon: History },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ],
  team_lead: [
    { label: 'Team Dashboard', path: '/team', icon: LayoutDashboard },
    { label: 'Team Members', path: '/team/members', icon: Users },
    { label: 'Risk & Actions', path: '/team/risk', icon: Shield },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ],
  end_user: [
    { label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Initiatives', path: '/dashboard/initiatives', icon: Target },
    { label: 'My Progress', path: '/dashboard/progress', icon: BarChart3 },
    { label: 'Achievements', path: '/dashboard/achievements', icon: Award },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ],
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);

  if (!user) return null;

  const items = navByRole[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={cn(
      "amp-gradient-sidebar flex flex-col h-screen transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center px-4 h-16 border-b border-sidebar-border">
        {!collapsed ? (
          <img src={ampLogo} alt="AMP — powered by Change Logic" className="h-10 object-contain" />
        ) : (
          <img src={ampLogo} alt="AMP" className="h-8 object-contain mx-auto" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-muted">{getRoleLabel(user.role)}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          title="Sign out"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

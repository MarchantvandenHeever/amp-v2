import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleDashboardPath, getRoleLabel, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Users, BarChart3, User, Loader2 } from 'lucide-react';
import ampLogo from '@/assets/amp-logo-colour.png';
import ampLogoTransparent from '@/assets/amp-logo-colour.png';

const roleConfig: Record<UserRole, { icon: React.ElementType; description: string; color: string }> = {
  super_admin: { icon: Shield, description: 'Platform-wide settings, customers, and analytics', color: 'bg-amp-participation/10 text-amp-participation' },
  change_manager: { icon: BarChart3, description: 'Create initiatives, manage journeys, monitor adoption', color: 'bg-amp-ownership/10 text-amp-ownership' },
  team_lead: { icon: Users, description: 'View team adoption, identify risks, coach members', color: 'bg-amp-confidence/10 text-amp-confidence' },
  end_user: { icon: User, description: 'Complete micro-actions, build your adoption journey', color: 'bg-amp-adoption/10 text-amp-adoption' },
};

interface DemoPersona {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  team: string | null;
  persona: string | null;
}

const Login: React.FC = () => {
  const { login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersonas = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, email, role, team, persona')
        .in('email', [
          'sarah.chen@ampplatform.com',
          'james.mitchell@acmecorp.com',
          'rachel.torres@acmecorp.com',
          'alex.morgan@acmecorp.com',
          'maria.santos@acmecorp.com',
          'emma.wilson@acmecorp.com',
        ]);
      if (data) setPersonas(data as DemoPersona[]);
      setLoading(false);
    };
    fetchPersonas();
  }, []);

  const handleLogin = async (profileId: string, role: UserRole) => {
    setLoggingIn(profileId);
    await login(profileId);
    navigate(getRoleDashboardPath(role));
  };

  const getSublabel = (p: DemoPersona) => {
    const roleLabel = getRoleLabel(p.role);
    if (p.role === 'end_user' || p.role === 'team_lead') {
      return `${roleLabel} — ${p.team}`;
    }
    return roleLabel;
  };

  // Sort personas by role order
  const roleOrder: UserRole[] = ['super_admin', 'change_manager', 'team_lead', 'end_user'];
  const sortedPersonas = [...personas].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 amp-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-primary-foreground/20"
              style={{
                width: `${200 + i * 120}px`, height: `${200 + i * 120}px`,
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
         <div className="relative z-10 max-w-md text-center">
          <img src={ampLogoTransparent} alt="AMP — powered by Change Logic" className="h-20 object-contain mx-auto mb-8" />
          <h1 className="font-heading text-4xl font-bold text-primary-foreground mb-4 tracking-tight">
            Adoption Management Platform
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed mb-8">
            Adoption is evidenced through behaviour. AMP makes behavioural readiness visible.
          </p>
          <div className="flex flex-col gap-3 text-left">
            {['Participation is only the beginning', 'Ownership and confidence signal whether change is truly forming', 'Small actions build embedment'].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-primary-foreground/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 text-center">
            <img src={ampLogo} alt="AMP — powered by Change Logic" className="h-14 object-contain mx-auto mb-4" />
          </div>

          <h2 className="font-heading text-2xl font-bold mb-2">Sign in to AMP</h2>
          <p className="text-muted-foreground text-sm mb-8">Choose a demo persona to explore the platform</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {sortedPersonas.map((persona, i) => {
                const config = roleConfig[persona.role];
                const Icon = config.icon;
                return (
                  <motion.button
                    key={persona.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleLogin(persona.id, persona.role)}
                    disabled={!!loggingIn}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:amp-shadow-card-hover hover:border-primary/30 transition-all group text-left disabled:opacity-50"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{persona.display_name}</p>
                      <p className="text-xs text-muted-foreground">{getSublabel(persona)}</p>
                    </div>
                    {loggingIn === persona.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            AMP v2 Demo — Behavioural Adoption Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

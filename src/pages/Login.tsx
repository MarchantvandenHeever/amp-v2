import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleDashboardPath, getRoleLabel, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Users, BarChart3, User, Loader2, Check } from 'lucide-react';
import { BrandLogo } from '@/components/cl/BrandLogo';
import { HeroPattern } from '@/components/cl/HeroPattern';

const roleConfig: Record<UserRole, { icon: React.ElementType; description: string; tone: string }> = {
  super_admin:    { icon: Shield,    description: 'Platform-wide settings, customers, and analytics', tone: 'bg-amp-participation/10 text-amp-participation' },
  change_manager: { icon: BarChart3, description: 'Create initiatives, manage journeys, monitor adoption', tone: 'bg-amp-ownership/10 text-amp-ownership' },
  team_lead:      { icon: Users,     description: 'View team adoption, identify risks, coach members', tone: 'bg-amp-confidence/10 text-amp-confidence' },
  end_user:       { icon: User,      description: 'Complete micro-actions, build your adoption journey', tone: 'bg-amp-adoption/10 text-amp-adoption' },
};

interface DemoPersona {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  team: string | null;
  persona: string | null;
}

const valueProps = [
  'Participation is only the beginning',
  'Ownership and confidence signal whether change is truly forming',
  'Small actions build embedment',
];

const Login: React.FC = () => {
  const { login } = useAuth();
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

  const roleOrder: UserRole[] = ['super_admin', 'change_manager', 'team_lead', 'end_user'];
  const sortedPersonas = [...personas].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — branded hero (matches PageHero treatment) */}
        <div className="relative lg:w-1/2 cl-hero overflow-hidden flex items-center justify-center px-8 py-12 lg:py-16">
          <HeroPattern className="absolute inset-0 w-full h-full pointer-events-none opacity-90" />

          <div className="relative z-10 w-full max-w-md">
            <div className="rounded-2xl px-5 py-4 inline-flex shadow-sm mb-10" style={{ backgroundColor: '#e8e6d8' }}>
              <BrandLogo className="h-12" />
            </div>

            <h1 className="font-heading text-4xl lg:text-[44px] font-bold text-white tracking-tight leading-[1.1]">
              Adoption Management Platform
            </h1>
            <p className="text-white/80 text-base lg:text-lg leading-relaxed mt-4 max-w-sm">
              Adoption is evidenced through behaviour. AMP makes behavioural readiness visible.
            </p>

            <div className="mt-10 space-y-3">
              {valueProps.map((text) => (
                <div key={text} className="flex items-start gap-3 text-white/85 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — sign-in panel */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden mb-8 flex justify-center">
              <BrandLogo className="h-12" />
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-2">
                Welcome back
              </p>
              <h2 className="font-heading text-3xl font-bold text-foreground tracking-tight">
                Sign in to AMP
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                Choose a demo persona to explore the platform.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedPersonas.map((persona, i) => {
                  const config = roleConfig[persona.role];
                  const Icon = config.icon;
                  const isLoading = loggingIn === persona.id;
                  return (
                    <motion.button
                      key={persona.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => handleLogin(persona.id, persona.role)}
                      disabled={!!loggingIn}
                      className="w-full flex items-center gap-4 p-4 cl-card cl-card-hover hover:border-primary/40 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.tone} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{persona.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{getSublabel(persona)}</p>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-10">
              AMP v2 Demo · Behavioural Adoption Platform
            </p>
          </motion.div>
        </div>
      </div>

      <footer className="bg-nav text-nav-muted text-xs py-4 text-center font-medium tracking-wide">
        Powered by Change Logic {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Login;

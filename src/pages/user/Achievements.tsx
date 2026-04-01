import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useBadges, useUserBadges, getTierFromPoints } from '@/hooks/useSupabaseData';
import { Award, Trophy, Star, Zap, Lock, Crown, Flame, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';


const tierConfig = [
  { name: 'Starter', min: 0, max: 499, icon: Star, color: 'text-muted-foreground', bg: 'from-muted to-muted/50' },
  { name: 'Contributor', min: 500, max: 999, icon: Zap, color: 'text-amp-participation', bg: 'from-amp-participation/20 to-amp-participation/5' },
  { name: 'Owner', min: 1000, max: 1999, icon: Trophy, color: 'text-amp-ownership', bg: 'from-amp-ownership/20 to-amp-ownership/5' },
  { name: 'Leader', min: 2000, max: Infinity, icon: Crown, color: 'text-amp-adoption', bg: 'from-amp-adoption/20 to-amp-adoption/5' },
];

const Achievements: React.FC = () => {
  const { user } = useAuth();
  const { data: allBadges, isLoading: loadingBadges } = useBadges();
  const { data: userBadges, isLoading: loadingUserBadges } = useUserBadges(user?.id);

  if (!user) return null;

  const isLoading = loadingBadges || loadingUserBadges;
  const tier = getTierFromPoints(user.points);
  const currentTierConfig = tierConfig.find(t => t.name === tier) || tierConfig[0];
  const nextTier = tierConfig.find(t => t.min > user.points);
  const earnedBadgeIds = (userBadges || []).map((ub: any) => ub.badge_id);
  const badges = allBadges || [];
  const earnedCount = earnedBadgeIds.length;
  const totalCount = badges.length;
  const progressToNext = nextTier
    ? Math.round(((user.points - currentTierConfig.min) / (nextTier.min - currentTierConfig.min)) * 100)
    : 100;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const TierIcon = currentTierConfig.icon;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border p-8 bg-gradient-to-br",
            currentTierConfig.bg
          )}
        >
          <Sparkles className="absolute top-4 right-4 w-24 h-24 text-foreground/5" />
          <div className="flex items-center gap-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className={cn("w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center amp-shadow-card", currentTierConfig.color)}
            >
              <TierIcon className="w-10 h-10" />
            </motion.div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Tier</p>
              <h1 className="font-heading text-3xl font-bold">{tier}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user.points.toLocaleString()} points earned
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-1">
                <Flame className="w-5 h-5 text-amp-confidence" />
                <span className="font-heading text-2xl font-bold">{user.streak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>

          {/* Tier Progress */}
          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{currentTierConfig.name}</span>
                <span>{nextTier.name} — {nextTier.min - user.points} points to go</span>
              </div>
              <div className="w-full h-3 rounded-full bg-background/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-amp-adoption"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Tier Roadmap */}
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Tier Roadmap</h2>
          <div className="grid grid-cols-4 gap-3">
            {tierConfig.map((t, i) => {
              const reached = user.points >= t.min;
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "rounded-xl border p-4 text-center transition-all",
                    reached
                      ? "border-primary/30 bg-card amp-shadow-card"
                      : "border-border bg-card/50 opacity-50"
                  )}
                >
                  <Icon className={cn("w-8 h-8 mx-auto mb-2", reached ? t.color : "text-muted-foreground")} />
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.min === 0 ? '0' : t.min.toLocaleString()}+ pts</p>
                  {reached && <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">✓ Unlocked</span>}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card text-center">
            <Award className="w-6 h-6 text-amp-ownership mx-auto mb-2" />
            <p className="font-heading text-3xl font-bold">{earnedCount}</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card text-center">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="font-heading text-3xl font-bold">{totalCount - earnedCount}</p>
            <p className="text-xs text-muted-foreground">Badges Remaining</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card text-center">
            <Trophy className="w-6 h-6 text-amp-adoption mx-auto mb-2" />
            <p className="font-heading text-3xl font-bold">{totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Completion</p>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amp-confidence" />
              Your Badges
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((badge, i) => {
              const earned = earnedBadgeIds.includes(badge.id);
              const earnedData = earned ? (userBadges || []).find((ub: any) => ub.badge_id === badge.id) : null;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                  className={cn(
                    "relative rounded-2xl border p-5 text-center transition-all group",
                    earned
                      ? "border-primary/20 bg-card amp-shadow-card hover:scale-[1.03] cursor-default"
                      : "border-border bg-card/30 opacity-40 grayscale"
                  )}
                >
                  {earned && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  )}
                  <motion.span
                    className="text-4xl block mb-3"
                    animate={earned ? { y: [0, -4, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                  >
                    {badge.icon || '🏅'}
                  </motion.span>
                  <p className="text-sm font-semibold">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
                  {earned && earnedData && (
                    <p className="text-[9px] text-primary mt-2 font-medium">
                      Earned {new Date(earnedData.earned_at).toLocaleDateString()}
                    </p>
                  )}
                  {!earned && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Locked</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Achievements;

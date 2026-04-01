import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard, AdoptionScoreRing } from '@/components/scores/ScoreCard';
import { useAuth } from '@/contexts/AuthContext';
import { initiatives, journeys, announcements, allBadges, getTierFromPoints, getScoreLabel } from '@/data/mockData';
import { motion } from 'framer-motion';
import { Target, Flame, Star, ChevronRight, Clock, CheckCircle2, Circle, Lock, Upload, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const itemTypeIcon: Record<string, React.ElementType> = {
  content: Circle,
  activity: CheckCircle2,
  form: MessageSquare,
  confidence_check: Star,
  evidence_upload: Upload,
  reflection: MessageSquare,
  scenario: Target,
};

const EndUserDashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const tier = getTierFromPoints(user.points);
  const activeJourneys = journeys.filter(j => j.status === 'active');

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="amp-gradient-hero rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="text-primary-foreground/70 text-sm mt-1">Small actions build embedment. Keep going.</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amp-confidence" />
                  <span className="font-heading font-bold text-lg">{user.streak}</span>
                </div>
                <p className="text-[10px] text-primary-foreground/60">day streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amp-confidence" />
                  <span className="font-heading font-bold text-lg">{user.points}</span>
                </div>
                <p className="text-[10px] text-primary-foreground/60">points</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-xs font-medium">
                {tier}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card flex flex-col items-center justify-center">
            <AdoptionScoreRing score={user.scores.adoption} size={120} />
            <p className="text-xs text-muted-foreground mt-1">{getScoreLabel(user.scores.adoption)}</p>
          </div>
          <ScoreCard label="Participation" score={user.scores.participation} color="participation" size="sm" />
          <ScoreCard label="Ownership" score={user.scores.ownership} color="ownership" size="sm" />
          <ScoreCard label="Confidence" score={user.scores.confidence} color="confidence" size="sm" />
        </div>

        {/* Announcements */}
        {announcements.filter(a => a.active).length > 0 && (
          <div className="space-y-2">
            {announcements.filter(a => a.active).slice(0, 2).map(ann => (
              <div key={ann.id} className="bg-card border border-border rounded-xl p-4 amp-shadow-card flex items-start gap-3">
                <span className="text-lg">{ann.type === 'celebration' ? '🏆' : ann.type === 'action' ? '🚀' : '📋'}</span>
                <div>
                  <p className="text-sm font-semibold">{ann.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Journeys / Next Actions */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Your Active Journeys</h3>
          <div className="space-y-3">
            {activeJourneys.map(journey => {
              const nextItem = journey.items.find(i => i.status === 'in_progress' || i.status === 'available');
              return (
                <motion.div key={journey.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-5 amp-shadow-card hover:amp-shadow-card-hover transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-sm">{journey.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{journey.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${journey.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold">{journey.progress}%</span>
                  </div>
                  {nextItem && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/70 text-xs">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {React.createElement(itemTypeIcon[nextItem.type] || Circle, { className: 'w-3 h-3 text-primary' })}
                      </div>
                      <span className="font-medium">Next: {nextItem.title}</span>
                      {nextItem.dueDate && (
                        <span className="text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {nextItem.dueDate}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Item list */}
                  <div className="mt-3 space-y-1">
                    {journey.items.map(item => {
                      const Icon = itemTypeIcon[item.type] || Circle;
                      return (
                        <div key={item.id} className={`flex items-center gap-2 text-xs py-1.5 ${item.status === 'locked' ? 'opacity-40' : ''}`}>
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-amp-success shrink-0" />
                          ) : item.status === 'locked' ? (
                            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <Icon className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <span className={item.status === 'completed' ? 'line-through text-muted-foreground' : ''}>{item.title}</span>
                          <span className="text-muted-foreground ml-auto">{item.duration}</span>
                          <div className="flex gap-1">
                            {item.contributesTo.map(c => (
                              <span key={c} className={`w-1.5 h-1.5 rounded-full ${
                                c === 'participation' ? 'bg-amp-participation' :
                                c === 'ownership' ? 'bg-amp-ownership' : 'bg-amp-confidence'
                              }`} title={c} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {allBadges.map(badge => {
              const earned = user.badges.includes(badge.name);
              return (
                <div key={badge.id} className={`bg-card border border-border rounded-xl p-3 text-center amp-shadow-card ${!earned ? 'opacity-30' : ''}`}>
                  <span className="text-2xl block mb-1">{badge.icon}</span>
                  <p className="text-xs font-semibold">{badge.name}</p>
                  <p className="text-[10px] text-muted-foreground">{badge.tier}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EndUserDashboard;

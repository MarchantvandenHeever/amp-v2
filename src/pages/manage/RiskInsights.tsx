import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { riskFlags, endUsers } from '@/data/mockData';
import { AlertTriangle, TrendingDown, Eye, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

const interventions = [
  { action: 'Increase reminders', target: 'Disengaging users', impact: 'High', users: 2 },
  { action: 'Add proof-based task', target: 'Low ownership users', impact: 'High', users: 3 },
  { action: 'Trigger manager coaching', target: 'Low confidence users', impact: 'Medium', users: 2 },
  { action: 'Add repetition cycle', target: 'Unstable confidence', impact: 'Medium', users: 1 },
  { action: 'Boost starter reinforcement', target: 'Reminder-dependent', impact: 'Medium', users: 2 },
  { action: 'Simplify journey', target: 'Evidence-missing users', impact: 'Low', users: 1 },
];

const RiskInsights: React.FC = () => {
  const highRisk = riskFlags.filter(r => r.severity === 'high');
  const medRisk = riskFlags.filter(r => r.severity === 'medium');

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Risk & Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Where behaviour is fragile and where reinforcement is working</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amp-risk" />
              <span className="text-xs font-medium text-muted-foreground uppercase">High Risk</span>
            </div>
            <p className="font-heading text-3xl font-bold text-amp-risk">{highRisk.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-amp-warning" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Medium Risk</span>
            </div>
            <p className="font-heading text-3xl font-bold text-amp-confidence">{medRisk.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 amp-shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-amp-info" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Total Flags</span>
            </div>
            <p className="font-heading text-3xl font-bold">{riskFlags.length}</p>
          </div>
        </div>

        {/* Risk flags table */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <h3 className="font-heading font-semibold mb-4">Active Risk Flags</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Risk Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Severity</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {riskFlags.map(flag => (
                  <tr key={flag.id} className="border-b border-border/50 hover:bg-secondary/50">
                    <td className="py-2.5 px-3 font-medium">{flag.userName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{flag.team}</td>
                    <td className="py-2.5 px-3">{flag.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        flag.severity === 'high' ? 'bg-amp-risk/10 text-amp-risk' :
                        flag.severity === 'medium' ? 'bg-amp-warning/10 text-amp-confidence' :
                        'bg-secondary text-muted-foreground'
                      }`}>{flag.severity}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs max-w-xs">{flag.description}</td>
                    <td className="py-2.5 px-3 text-primary text-xs font-medium">{flag.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intervention recommendations */}
        <div className="bg-card border border-border rounded-xl p-6 amp-shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amp-confidence" />
            <h3 className="font-heading font-semibold">Recommended Interventions</h3>
          </div>
          <div className="space-y-2">
            {interventions.map((intv, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">{intv.action}</p>
                  <p className="text-xs text-muted-foreground">{intv.target}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  intv.impact === 'High' ? 'bg-amp-risk/10 text-amp-risk' :
                  intv.impact === 'Medium' ? 'bg-amp-warning/10 text-amp-confidence' :
                  'bg-secondary text-muted-foreground'
                }`}>{intv.impact} impact</span>
                <span className="text-xs text-muted-foreground">{intv.users} users</span>
                <button className="px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/5">Apply</button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RiskInsights;

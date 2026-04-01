import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { initiatives, journeys } from '@/data/mockData';
import { motion } from 'framer-motion';
import { Calendar, Users, ChevronRight } from 'lucide-react';

const InitiativeList: React.FC = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Initiatives</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage adoption initiatives and track progress</p>
          </div>
          <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            + New Initiative
          </button>
        </div>

        <div className="space-y-4">
          {initiatives.map((init, i) => (
            <motion.div key={init.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 amp-shadow-card hover:amp-shadow-card-hover transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{init.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{init.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amp-adoption" style={{ width: `${init.progress}%` }} />
                </div>
                <span className="text-sm font-semibold">{init.progress}%</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{init.startDate} → {init.endDate}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{init.userCount} users</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary font-medium">{init.phase.replace(/_/g, ' ')}</span>
                <span>{init.milestones.length} milestones · {journeys.filter(j => j.initiativeId === init.id).length} journeys</span>
              </div>
              {/* Milestones */}
              <div className="mt-4 flex gap-2">
                {init.milestones.map(ms => (
                  <div key={ms.id} className={`flex-1 p-3 rounded-lg border ${
                    ms.status === 'completed' ? 'border-amp-success/30 bg-amp-success/5' :
                    ms.status === 'active' ? 'border-primary/30 bg-primary/5' :
                    'border-border bg-secondary/30'
                  }`}>
                    <p className="text-xs font-medium">{ms.name}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${ms.status === 'completed' ? 'bg-amp-success' : 'bg-primary'}`} style={{ width: `${ms.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold">{ms.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default InitiativeList;

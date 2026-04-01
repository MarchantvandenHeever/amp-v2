import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { journeys, JourneyItem } from '@/data/mockData';
import { motion } from 'framer-motion';
import { GripVertical, Plus, ChevronDown, ChevronUp, Settings, CheckCircle2, Circle, Upload, MessageSquare, Star, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  content: FileText,
  activity: CheckCircle2,
  form: MessageSquare,
  confidence_check: Star,
  evidence_upload: Upload,
  reflection: MessageSquare,
  scenario: Target,
};

const typeLabels: Record<string, string> = {
  content: 'Content',
  activity: 'Activity',
  form: 'Form',
  confidence_check: 'Confidence Check',
  evidence_upload: 'Evidence Upload',
  reflection: 'Reflection',
  scenario: 'Scenario',
};

const pillars = ['participation', 'ownership', 'confidence'] as const;
const pillarColors = {
  participation: 'bg-amp-participation text-primary-foreground',
  ownership: 'bg-amp-ownership text-primary-foreground',
  confidence: 'bg-amp-confidence text-accent-foreground',
};

const JourneyBuilder: React.FC = () => {
  const [selectedJourney, setSelectedJourney] = useState(journeys[1]); // Active journey
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Journey Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Design behavioural adoption journeys with structured micro-actions</p>
          </div>
          <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            + New Journey
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Journey list */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Journeys</h3>
            {journeys.map(j => (
              <button key={j.id} onClick={() => setSelectedJourney(j)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all text-sm",
                  selectedJourney.id === j.id
                    ? "border-primary bg-primary/5 amp-shadow-card"
                    : "border-border hover:border-primary/30 hover:bg-secondary/50"
                )}>
                <p className="font-medium">{j.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{j.items.length} items · {j.progress}%</p>
              </button>
            ))}
          </div>

          {/* Journey detail / builder */}
          <div className="lg:col-span-3 space-y-4">
            {/* Journey metadata */}
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">{selectedJourney.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedJourney.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  selectedJourney.status === 'active' ? 'bg-amp-success/10 text-amp-success' :
                  selectedJourney.status === 'draft' ? 'bg-secondary text-muted-foreground' :
                  'bg-amp-info/10 text-amp-info'
                }`}>{selectedJourney.status}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Weight: {selectedJourney.weight}</span>
                <span>{selectedJourney.items.filter(i => i.mandatory).length} mandatory items</span>
                <span>{selectedJourney.items.filter(i => i.status === 'completed').length}/{selectedJourney.items.length} completed</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workflow Items</h3>
                <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>

              {selectedJourney.items.map((item, i) => {
                const Icon = typeIcons[item.type] || Circle;
                const expanded = expandedItem === item.id;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-xl amp-shadow-card overflow-hidden">
                    <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedItem(expanded ? null : item.id)}>
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.status === 'completed' ? 'bg-amp-success/10' : 'bg-secondary'
                      }`}>
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-amp-success" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">required</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{typeLabels[item.type]}</span>
                          <span className="text-xs text-muted-foreground">· {item.duration}</span>
                          <span className="text-xs text-muted-foreground">· Weight: {item.weight}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 mr-2">
                        {item.contributesTo.map(c => (
                          <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full ${pillarColors[c]}`}>
                            {c[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {expanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                          <div><span className="text-muted-foreground">Description:</span><p className="mt-0.5">{item.description}</p></div>
                          <div><span className="text-muted-foreground">Status:</span><p className="mt-0.5 capitalize">{item.status.replace('_', ' ')}</p></div>
                          <div><span className="text-muted-foreground">Due Date:</span><p className="mt-0.5">{item.dueDate || '—'}</p></div>
                          <div><span className="text-muted-foreground">Completed:</span><p className="mt-0.5">{item.completedDate || '—'}</p></div>
                          <div><span className="text-muted-foreground">Contributes to:</span>
                            <div className="flex gap-1 mt-0.5">{item.contributesTo.map(c => (
                              <span key={c} className="capitalize">{c}</span>
                            )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`}>, </span>, curr], [] as React.ReactNode[])}</div>
                          </div>
                          <div><span className="text-muted-foreground">Mandatory:</span><p className="mt-0.5">{item.mandatory ? 'Yes' : 'No'}</p></div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors flex items-center gap-1">
                            <Settings className="w-3 h-3" /> Configure
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default JourneyBuilder;

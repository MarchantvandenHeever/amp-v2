import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface GanttItem {
  id: string;
  title: string;
  type: string;
  status: string;
  due_date?: string | null;
  duration?: string | null;
  order_index?: number | null;
  execution_mode?: string;
  predecessor_id?: string | null;
  phase_id?: string | null;
  mandatory?: boolean | null;
  contributes_to?: string[] | null;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  order_index?: number | null;
}

interface GanttChartProps {
  items: GanttItem[];
  phases: Phase[];
}

const statusColors: Record<string, string> = {
  completed: 'bg-amp-success',
  in_progress: 'bg-amp-info',
  available: 'bg-primary',
  locked: 'bg-muted-foreground/40',
};

const parseDuration = (d?: string | null): number => {
  if (!d) return 1;
  const m = d.match(/(\d+)/);
  const num = m ? parseInt(m[1]) : 5;
  if (d.includes('hour') || d.includes('hr')) return Math.max(num * 4, 1);
  return Math.max(Math.ceil(num / 5), 1); // 5min = 1 unit
};

export const GanttChart: React.FC<GanttChartProps> = ({ items, phases }) => {
  const totalUnits = useMemo(() => {
    return Math.max(items.reduce((s, i) => s + parseDuration(i.duration), 0), 20);
  }, [items]);

  const phaseMap = useMemo(() => {
    const m: Record<string, Phase> = {};
    phases.forEach(p => { m[p.id] = p; });
    return m;
  }, [phases]);

  // Group items by phase
  const grouped = useMemo(() => {
    const groups: { phase: Phase | null; items: GanttItem[] }[] = [];
    const phaseItems: Record<string, GanttItem[]> = {};
    const noPhase: GanttItem[] = [];

    items.forEach(item => {
      if (item.phase_id && phaseMap[item.phase_id]) {
        if (!phaseItems[item.phase_id]) phaseItems[item.phase_id] = [];
        phaseItems[item.phase_id].push(item);
      } else {
        noPhase.push(item);
      }
    });

    // Sorted phases first
    const sortedPhases = [...phases].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    sortedPhases.forEach(p => {
      if (phaseItems[p.id]) groups.push({ phase: p, items: phaseItems[p.id] });
    });
    if (noPhase.length > 0) groups.push({ phase: null, items: noPhase });
    return groups;
  }, [items, phases, phaseMap]);

  // Compute start offsets
  let runningOffset = 0;
  const offsets: Record<string, number> = {};
  const durations: Record<string, number> = {};

  // Handle series/parallel and dependencies
  items.forEach(item => {
    const dur = parseDuration(item.duration);
    durations[item.id] = dur;
    if (item.predecessor_id && offsets[item.predecessor_id] !== undefined) {
      offsets[item.id] = offsets[item.predecessor_id] + durations[item.predecessor_id];
    } else if (item.execution_mode === 'parallel' && runningOffset > 0) {
      offsets[item.id] = Math.max(runningOffset - parseDuration(items.find(i => i.order_index === (item.order_index || 0) - 1)?.duration), 0);
    } else {
      offsets[item.id] = runningOffset;
    }
    if (item.execution_mode !== 'parallel') {
      runningOffset = offsets[item.id] + dur;
    } else {
      runningOffset = Math.max(runningOffset, offsets[item.id] + dur);
    }
  });

  const maxEnd = Math.max(...Object.entries(offsets).map(([id, off]) => off + (durations[id] || 1)), 20);

  // Time columns
  const cols = Array.from({ length: Math.ceil(maxEnd) }, (_, i) => i);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden amp-shadow-card">
      <div className="p-4 border-b border-border">
        <h3 className="font-heading text-sm font-semibold">Gantt View</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Timeline visualization of workflow items</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-border">
            <div className="w-56 shrink-0 px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/30">Item</div>
            <div className="flex-1 flex">
              {cols.map(c => (
                <div key={c} className="flex-1 min-w-[30px] px-1 py-2 text-[10px] text-center text-muted-foreground border-l border-border/30">
                  {c + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {grouped.map((group, gi) => (
            <React.Fragment key={gi}>
              {group.phase && (
                <div className="flex border-b border-border bg-secondary/20">
                  <div className="w-56 shrink-0 px-4 py-1.5 text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${group.phase.status === 'active' ? 'bg-amp-success' : group.phase.status === 'inactive' ? 'bg-muted-foreground/40' : 'bg-amp-info'}`} />
                    {group.phase.name}
                  </div>
                  <div className="flex-1" />
                </div>
              )}
              {group.items.map(item => {
                const off = offsets[item.id] || 0;
                const dur = durations[item.id] || 1;
                const leftPct = (off / maxEnd) * 100;
                const widthPct = (dur / maxEnd) * 100;
                return (
                  <div key={item.id} className="flex border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <div className="w-56 shrink-0 px-4 py-2 flex items-center gap-2">
                      <span className="text-xs truncate font-medium">{item.title}</span>
                      {item.execution_mode === 'parallel' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amp-info/10 text-amp-info font-medium shrink-0">∥</span>
                      )}
                      {item.predecessor_id && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amp-warning/10 text-amp-warning font-medium shrink-0">dep</span>
                      )}
                    </div>
                    <div className="flex-1 relative py-2">
                      <div
                        className={cn('absolute top-1/2 -translate-y-1/2 h-5 rounded-md transition-all', statusColors[item.status] || 'bg-primary')}
                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                        title={`${item.title} (${item.duration || '5 min'})`}
                      >
                        <span className="text-[9px] text-primary-foreground px-1.5 truncate block leading-5">{item.duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amp-success" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amp-info" /> In Progress</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-muted-foreground/40" /> Locked</span>
        <span className="flex items-center gap-1"><span className="text-[9px] px-1 rounded bg-amp-info/10 text-amp-info">∥</span> Parallel</span>
        <span className="flex items-center gap-1"><span className="text-[9px] px-1 rounded bg-amp-warning/10 text-amp-warning">dep</span> Has Dependency</span>
      </div>
    </div>
  );
};

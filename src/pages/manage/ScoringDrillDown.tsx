import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/cl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useEndUsers, useInitiatives, useScores } from '@/hooks/useSupabaseData';
import { useTraitObservations, useBehaviouralFlags } from '@/hooks/useScoring';
import { useScoringConfig } from '@/hooks/useScoringConfig';

/**
 * Score drill-down: shows the full audit trail for a (user × initiative) pair —
 * raw trait values x_i, baselines (μ_i, σ_i), CV_i, scaled s_i, weight w_i,
 * decay window, half-life, pillar score, dashboard score, A_ideal, A_gap,
 * and any active behavioural flags. Every value comes directly from the
 * trait_observations / scores / behavioural_flags tables written by the
 * score-recalc edge function — there are no hard-coded display values.
 */
const ScoringDrillDown: React.FC = () => {
  const { data: users } = useEndUsers();
  const { data: initiatives } = useInitiatives();
  const { data: config } = useScoringConfig();
  const [userId, setUserId] = useState<string>('');
  const [initiativeId, setInitiativeId] = useState<string>('');

  const { data: traits, isLoading: loadingTraits } = useTraitObservations(userId, initiativeId);
  const { data: flags } = useBehaviouralFlags(userId, initiativeId);
  const { data: scores } = useScores(initiativeId);
  const score = useMemo(
    () => scores?.find((s: any) => s.user_id === userId),
    [scores, userId],
  );

  const groupedTraits = useMemo(() => {
    const out: Record<string, any[]> = { participation: [], ownership: [], confidence: [] };
    for (const t of traits ?? []) (out[t.pillar] ??= []).push(t);
    return out;
  }, [traits]);

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Score Drill-Down"
          subtitle="Inspect the verbatim AMP scoring computation for any user × initiative."
          size="sm"
        />
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="cl-card p-5 flex flex-wrap gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">User</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Select a user" /></SelectTrigger>
              <SelectContent>
                {users?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.display_name} · {u.team || '—'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Initiative</label>
            <Select value={initiativeId} onValueChange={setInitiativeId}>
              <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Select an initiative" /></SelectTrigger>
              <SelectContent>
                {initiatives?.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} · {i.phase}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!userId || !initiativeId ? (
          <div className="cl-card p-8 text-sm text-muted-foreground">Pick a user and an initiative to see the score breakdown.</div>
        ) : loadingTraits ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {score && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryTile label="Participation (0–100)" value={Math.round(Number(score.participation))} sub={`dash ${Math.round(Number(score.participation_dashboard))}`} />
                <SummaryTile label="Ownership (0–100)" value={Math.round(Number(score.ownership))} sub={`dash ${Math.round(Number(score.ownership_dashboard))}`} />
                <SummaryTile label="Confidence (0–100)" value={Math.round(Number(score.confidence))} sub={`dash ${Math.round(Number(score.confidence_dashboard))}`} />
                <SummaryTile label="Adoption (0–100)" value={Math.round(Number(score.adoption_score_100))}
                  sub={`dash ${Math.round(Number(score.adoption_dashboard))} · ideal ${Math.round(Number(score.adoption_ideal))} · gap ${Number(score.adoption_gap).toFixed(2)}`} />
              </div>
            )}

            {score && (
              <div className="cl-card p-5 text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><strong>p (time progress):</strong> {Number(score.time_progress).toFixed(3)}</div>
                <div><strong>Phase used:</strong> {score.phase_used}</div>
                <div><strong>Rolling window:</strong> {score.rolling_window_days}d</div>
                <div><strong>Half-life:</strong> {Number(score.half_life_days)}d</div>
                <div><strong>Weighting mode:</strong> {config?.adoption_target?.weighting_mode}</div>
                <div><strong>A_target:</strong> {config?.adoption_target?.A_target}</div>
              </div>
            )}

            {(['participation', 'ownership', 'confidence'] as const).map((pillar) => (
              <div key={pillar} className="cl-card p-5">
                <h3 className="font-heading text-sm font-semibold mb-3 capitalize">{pillar} traits</h3>
                {groupedTraits[pillar].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No observations yet — run a recalculation.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 px-2 font-medium">Trait</th>
                          <th className="text-left py-2 px-2 font-medium">Events</th>
                          <th className="text-left py-2 px-2 font-medium">x_i</th>
                          <th className="text-left py-2 px-2 font-medium">μ_i</th>
                          <th className="text-left py-2 px-2 font-medium">σ_i</th>
                          <th className="text-left py-2 px-2 font-medium">CV_i</th>
                          <th className="text-left py-2 px-2 font-medium">s_i</th>
                          <th className="text-left py-2 px-2 font-medium">w_i</th>
                          <th className="text-left py-2 px-2 font-medium">w·s</th>
                          <th className="text-left py-2 px-2 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedTraits[pillar].map((t: any) => {
                          const cv = Number(t.baseline_sd) / Math.max(Number(t.baseline_mean), 0.01);
                          const ws = Number(t.weight) * Number(t.scaled_value);
                          const fallback = Number(t.event_count) === 0;
                          return (
                            <tr key={t.id} className="border-b border-border/50">
                              <td className="py-1.5 px-2 font-mono">{t.trait_key}</td>
                              <td className="py-1.5 px-2">{t.event_count}</td>
                              <td className="py-1.5 px-2">{Number(t.observed_value).toFixed(3)}</td>
                              <td className="py-1.5 px-2">{Number(t.baseline_mean).toFixed(2)}</td>
                              <td className="py-1.5 px-2">{Number(t.baseline_sd).toFixed(2)}</td>
                              <td className="py-1.5 px-2">{cv.toFixed(2)}</td>
                              <td className="py-1.5 px-2">{Number(t.scaled_value).toFixed(3)}</td>
                              <td className="py-1.5 px-2">{Number(t.weight).toFixed(2)}</td>
                              <td className="py-1.5 px-2">{ws.toFixed(3)}</td>
                              <td className="py-1.5 px-2">
                                {fallback
                                  ? <span className="text-amp-warning">baseline μ (no events)</span>
                                  : <span className="text-amp-success">decay-weighted events</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            <div className="cl-card p-5">
              <h3 className="font-heading text-sm font-semibold mb-3">Operational flags (do not affect the score)</h3>
              {!flags || flags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active flags.</p>
              ) : (
                <ul className="space-y-2">
                  {flags.map((f: any) => (
                    <li key={f.id} className="flex items-start justify-between text-xs border-b border-border/50 pb-2">
                      <span><strong>{f.flag_type}</strong> · {f.pillar} · {f.severity}</span>
                      <code className="text-muted-foreground">{JSON.stringify(f.details)}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const SummaryTile: React.FC<{ label: string; value: number; sub?: string }> = ({ label, value, sub }) => (
  <div className="cl-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold mt-1">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default ScoringDrillDown;

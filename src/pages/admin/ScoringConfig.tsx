import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useScoringConfig, useUpdateScoringConfig } from '@/hooks/useScoringConfig';
import { useRecalcScores } from '@/hooks/useScoring';
import { validateWeights, TraitConfig, adoptionScore, getScoreBand } from '@/lib/scoringEngine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, AlertTriangle, CheckCircle2, Settings2, Gauge, Shield, Brain, Zap, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/cl';

const ScoringAdmin: React.FC = () => {
  const { data: config, isLoading } = useScoringConfig();
  const updateConfig = useUpdateScoringConfig();
  const recalc = useRecalcScores();
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [desiredTarget, setDesiredTarget] = useState<number>(85);
  const [weightingMode, setWeightingMode] = useState<'baseline' | 'phase'>('baseline');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(JSON.parse(JSON.stringify(config)));
      setDesiredTarget(Number(config.adoption_target?.A_target ?? 85));
      setWeightingMode((config.adoption_target?.weighting_mode ?? 'baseline') as 'baseline' | 'phase');
    }
  }, [config]);

  const handleRecalcNow = async () => {
    try {
      const res = await recalc.mutateAsync(undefined);
      toast.success(`Recalculated ${res.recalced} user × initiative pairs`);
    } catch (e: any) {
      toast.error(`Recalc failed: ${e.message}`);
    }
  };

  const handleSaveAdoptionTarget = async () => {
    await handleSave('adoption_target', {
      A_target: desiredTarget,
      weighting_mode: weightingMode,
      epsilon: 0.01,
    });
  };

  if (isLoading || !localConfig) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  const handleTraitChange = (dimension: string, key: string, field: string, value: number) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [key]: { ...prev[dimension][key], [field]: value },
      },
    }));
    setDirty(true);
  };

  const handlePhaseWeightChange = (phase: string, dim: string, value: number) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      phase_weights: {
        ...prev.phase_weights,
        [phase]: { ...prev.phase_weights[phase], [dim]: value },
      },
    }));
    setDirty(true);
  };

  const handleDecayChange = (field: string, value: number) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      decay_settings: { ...prev.decay_settings, [field]: value },
    }));
    setDirty(true);
  };

  const handleSave = async (configKey: string, value: any) => {
    try {
      await updateConfig.mutateAsync({ key: configKey, value });
      toast.success('Configuration saved');
      setDirty(false);
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const handleReset = () => {
    if (config) setLocalConfig(JSON.parse(JSON.stringify(config)));
    setDirty(false);
  };

  const renderTraitTable = (dimension: string, traits: Record<string, TraitConfig>, configKey: string) => {
    const validation = validateWeights(traits);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${validation.valid ? 'bg-amp-success/10 text-amp-success' : 'bg-destructive/10 text-destructive'}`}>
              {validation.valid ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Weights sum to {validation.sum}</> : <><AlertTriangle className="w-3 h-3 inline mr-1" />Weights sum to {validation.sum} (must = 1.00)</>}
            </span>
          </div>
          <Button size="sm" onClick={() => handleSave(configKey, traits)} disabled={updateConfig.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save {dimension.split('_')[0]}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Variable</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Trait</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-20">Weight</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-24">Baseline μ</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-24">Baseline σ</th>
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-16">CV</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(traits).map(([key, trait]) => {
                const cv = (trait.baseline_sd / Math.max(trait.baseline_mean, 0.01)).toFixed(2);
                return (
                  <tr key={key} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{key}</td>
                    <td className="py-2 px-2 text-sm">{trait.label}</td>
                    <td className="py-2 px-2">
                      <Input type="number" step={0.01} min={0} max={1} value={trait.weight}
                        onChange={e => handleTraitChange(dimension, key, 'weight', parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-xs" />
                    </td>
                    <td className="py-2 px-2">
                      <Input type="number" step={0.05} min={0} max={1} value={trait.baseline_mean}
                        onChange={e => handleTraitChange(dimension, key, 'baseline_mean', parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-xs" />
                    </td>
                    <td className="py-2 px-2">
                      <Input type="number" step={0.05} min={0} max={1} value={trait.baseline_sd}
                        onChange={e => handleTraitChange(dimension, key, 'baseline_sd', parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-xs" />
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{cv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const phaseLabels: Record<string, string> = {
    design_build: 'Design & Build',
    training_testing: 'Training & Testing',
    post_go_live: 'Post Go-Live',
  };

  // Live preview: compute a sample adoption score using current weights
  const sampleP = 65, sampleO = 72, sampleC = 58;

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Platform Scoring Configuration"
          subtitle="Configure the AMP Behavioural Adoption Scoring Model — trait weights, baselines, decay, and phase weighting"
          size="sm"
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={handleRecalcNow} disabled={recalc.isPending}
              className="bg-white text-foreground hover:bg-white/90 rounded-full">
              {recalc.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Recalculate scores now
            </Button>
            <Link to="/manage/scoring/drilldown">
              <Button variant="outline" size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/15 rounded-full">
                <Search className="w-3.5 h-3.5 mr-1" /> Score drill-down
              </Button>
            </Link>
            {dirty && (
              <Button variant="outline" size="sm" onClick={handleReset}
                className="bg-white/10 border-white/20 text-white hover:bg-white/15 rounded-full">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Changes
              </Button>
            )}
          </div>
        </PageHero>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">

        <Tabs defaultValue="adoption" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="adoption" className="text-xs"><Gauge className="w-3.5 h-3.5 mr-1" /> Adoption</TabsTrigger>
            <TabsTrigger value="participation" className="text-xs"><Zap className="w-3.5 h-3.5 mr-1" /> Participation</TabsTrigger>
            <TabsTrigger value="ownership" className="text-xs"><Shield className="w-3.5 h-3.5 mr-1" /> Ownership</TabsTrigger>
            <TabsTrigger value="confidence" className="text-xs"><Brain className="w-3.5 h-3.5 mr-1" /> Confidence</TabsTrigger>
            <TabsTrigger value="decay" className="text-xs"><Settings2 className="w-3.5 h-3.5 mr-1" /> Decay & Window</TabsTrigger>
          </TabsList>

          {/* Adoption Phase Weights */}
          <TabsContent value="adoption" className="space-y-6">
            {/* Desired Adoption Target */}
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-1">Desired Adoption Target</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Sets the target adoption score. The ideal score at any point = (journey progress %) × this target. e.g., at 50% progress with target 80, ideal = 40.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs space-y-2">
                  <Label>Target Score (0–100)</Label>
                  <Input
                    type="number" min={0} max={100} value={desiredTarget}
                    onChange={e => { setDesiredTarget(parseInt(e.target.value) || 0); setDirty(true); }}
                    className="h-9 w-32"
                  />
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 text-center flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Example at 50% journey progress</p>
                  <p className="text-2xl font-bold text-amp-adoption">{Math.round(0.5 * desiredTarget)}</p>
                  <p className="text-xs text-muted-foreground">Ideal adoption score</p>
                </div>
                <Button size="sm" onClick={() => handleSave('desired_adoption_target', desiredTarget)} disabled={updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save Target
                </Button>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-1">Phase-Based Dimension Weights</h3>
              <p className="text-xs text-muted-foreground mb-4">
                The adoption score formula: A = P×w_p + O×w_o + C×w_c. Weights must sum to 1.0 per phase.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Phase</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Participation</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Ownership</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Confidence</th>
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(localConfig.phase_weights).map(([phase, weights]: [string, any]) => {
                      const sum = (weights.participation + weights.ownership + weights.confidence).toFixed(2);
                      const valid = Math.abs(parseFloat(sum) - 1.0) < 0.01;
                      return (
                        <tr key={phase} className="border-b border-border/50">
                          <td className="py-2 px-3 font-medium text-sm">{phaseLabels[phase] || phase}</td>
                          <td className="py-2 px-3">
                            <Input type="number" step={0.05} min={0} max={1} value={weights.participation}
                              onChange={e => handlePhaseWeightChange(phase, 'participation', parseFloat(e.target.value) || 0)}
                              className="h-7 w-20 text-xs" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" step={0.05} min={0} max={1} value={weights.ownership}
                              onChange={e => handlePhaseWeightChange(phase, 'ownership', parseFloat(e.target.value) || 0)}
                              className="h-7 w-20 text-xs" />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" step={0.05} min={0} max={1} value={weights.confidence}
                              onChange={e => handlePhaseWeightChange(phase, 'confidence', parseFloat(e.target.value) || 0)}
                              className="h-7 w-20 text-xs" />
                          </td>
                          <td className={`py-2 px-3 text-xs font-medium ${valid ? 'text-amp-success' : 'text-destructive'}`}>{sum}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={() => handleSave('phase_weights', localConfig.phase_weights)} disabled={updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save Phase Weights
                </Button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-3">Live Score Preview</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Sample scores: P={sampleP}, O={sampleO}, C={sampleC}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(localConfig.phase_weights).map(([phase, weights]: [string, any]) => {
                  const score = adoptionScore(sampleP, sampleO, sampleC, phase, localConfig.phase_weights);
                  const band = getScoreBand(score);
                  return (
                    <div key={phase} className="bg-secondary/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{phaseLabels[phase]}</p>
                      <p className={`text-2xl font-bold text-${band.color}`}>{score}</p>
                      <p className={`text-xs text-${band.color}`}>{band.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formula Reference */}
            <div className="bg-secondary/20 border border-border rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold mb-2">Formula Reference</h3>
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <p>Decay: d_e = e^(-λ × age_days), λ = ln(2) / half_life</p>
                <p>Trait: X_i = Σ(x_ie × d_e) / Σ(d_e)</p>
                <p>CV_i = σ_i / max(μ_i, ε)</p>
                <p>Scaled: S_i = clip((X_i - μ_i) / ((1 + CV_i) × σ_i), -1, 1)</p>
                <p>Raw: Score_raw = Σ(w_i × S_i)</p>
                <p>Dashboard: Score_100 = 50 × (Score_raw + 1)</p>
                <p>Adoption: A = P×w_p + O×w_o + C×w_c</p>
              </div>
            </div>
          </TabsContent>

          {/* Participation Traits */}
          <TabsContent value="participation">
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-1">Participation Traits (10 variables)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Measures whether users engage with assigned change activities. Weights must sum to 1.00.
              </p>
              {renderTraitTable('participation_traits', localConfig.participation_traits, 'participation_traits')}
            </div>
          </TabsContent>

          {/* Ownership Traits */}
          <TabsContent value="ownership">
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-1">Ownership Traits (11 variables)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Measures whether users take responsibility for execution. Weights must sum to 1.00.
              </p>
              {renderTraitTable('ownership_traits', localConfig.ownership_traits, 'ownership_traits')}
            </div>
          </TabsContent>

          {/* Confidence Traits */}
          <TabsContent value="confidence">
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
              <h3 className="font-heading text-sm font-semibold mb-1">Confidence Traits (10 variables)</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Measures whether users believe they can perform required behaviours. Weights must sum to 1.00.
              </p>
              {renderTraitTable('confidence_traits', localConfig.confidence_traits, 'confidence_traits')}
            </div>
          </TabsContent>

          {/* Decay & Rolling Window */}
          <TabsContent value="decay">
            <div className="bg-card border border-border rounded-xl p-5 amp-shadow-card space-y-6">
              <div>
                <h3 className="font-heading text-sm font-semibold mb-1">Rolling Window & Decay Configuration</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Controls how recent behaviour is weighted. Shorter windows with faster decay emphasise recent activity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default Rolling Window (days)</Label>
                  <Input type="number" min={7} max={90} value={localConfig.decay_settings.default_window_days}
                    onChange={e => handleDecayChange('default_window_days', parseInt(e.target.value) || 14)} />
                  <p className="text-xs text-muted-foreground">Recommended: 7, 14, or 30 days</p>
                </div>
                <div className="space-y-2">
                  <Label>Default Half-Life (days)</Label>
                  <Input type="number" min={1} max={30} value={localConfig.decay_settings.default_half_life_days}
                    onChange={e => handleDecayChange('default_half_life_days', parseInt(e.target.value) || 7)} />
                  <p className="text-xs text-muted-foreground">Events this many days old receive 50% weight</p>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="text-xs font-medium mb-2">Decay Presets</h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(localConfig.decay_settings.presets || {}).map(([window, preset]: [string, any]) => (
                    <div key={window} className="bg-card rounded-lg p-3 border border-border text-center">
                      <p className="text-lg font-bold">{window}d</p>
                      <p className="text-xs text-muted-foreground">{preset.label}</p>
                      <p className="text-xs mt-1">Half-life: {preset.half_life}d</p>
                      <p className="text-xs text-muted-foreground">λ = {(Math.LN2 / preset.half_life).toFixed(4)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => handleSave('decay_settings', localConfig.decay_settings)} disabled={updateConfig.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1" /> Save Decay Settings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ScoringAdmin;

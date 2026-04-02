import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
  strokeWidth?: number;
  defaultVisible?: boolean;
}

const DEFAULT_SERIES: SeriesConfig[] = [
  { key: 'adoption', label: 'Actual Adoption', color: 'hsl(var(--amp-adoption))', strokeWidth: 2.5, defaultVisible: true },
  { key: 'idealAdoption', label: 'Ideal Adoption', color: 'hsl(var(--primary))', strokeWidth: 2, defaultVisible: true },
  { key: 'participation', label: 'Participation', color: 'hsl(var(--amp-participation))', strokeWidth: 1.5, defaultVisible: true },
  { key: 'ownership', label: 'Ownership', color: 'hsl(var(--amp-ownership))', strokeWidth: 1.5, defaultVisible: true },
  { key: 'confidence', label: 'Confidence', color: 'hsl(var(--amp-confidence))', strokeWidth: 1.5, defaultVisible: true },
];

export interface InitiativeOption {
  id: string;
  name: string;
  progress: number; // 0-100, represents journey completion %
}

interface AdoptionTrendChartProps {
  data: any[];
  height?: number;
  series?: SeriesConfig[];
  xDataKey?: string;
  /** Optional list of initiatives to enable per-initiative filtering */
  initiatives?: InitiativeOption[];
  /** Data keyed by initiative id — used when an initiative is selected */
  initiativeData?: Record<string, any[]>;
  /** Overall journey progress 0-100 for combined view (truncates data beyond this point) */
  progress?: number;
}

const AdoptionTrendChart: React.FC<AdoptionTrendChartProps> = ({
  data,
  height = 280,
  series = DEFAULT_SERIES,
  xDataKey = 'week',
  initiatives,
  initiativeData,
  progress,
}) => {
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map(s => [s.key, s.defaultVisible !== false]))
  );
  const [selectedInitiative, setSelectedInitiative] = useState<string>('combined');

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  // Determine active data + progress based on selection
  const { chartData, activeProgress } = useMemo(() => {
    let rawData = data;
    let prog = progress;

    if (selectedInitiative !== 'combined' && initiativeData?.[selectedInitiative]) {
      rawData = initiativeData[selectedInitiative];
      const init = initiatives?.find(i => i.id === selectedInitiative);
      prog = init?.progress;
    }

    if (prog != null && prog < 100 && rawData.length > 0) {
      // Truncate data: only show data points up to the progress %
      const cutoffIndex = Math.max(1, Math.ceil((prog / 100) * rawData.length));
      const truncated = rawData.slice(0, cutoffIndex);
      
      // Cap ideal adoption at progress-proportional value
      const capped = truncated.map((point: any, idx: number) => {
        const progressAtPoint = ((idx + 1) / rawData.length) * 100;
        if (progressAtPoint > (prog ?? 100)) {
          return { ...point, idealAdoption: undefined, adoption: undefined };
        }
        return point;
      });

      // Fill remaining points as empty for axis continuity
      const remaining = rawData.slice(cutoffIndex).map((point: any) => ({
        [xDataKey]: point[xDataKey],
      }));

      return { chartData: [...capped, ...remaining], activeProgress: prog };
    }

    return { chartData: rawData, activeProgress: prog ?? 100 };
  }, [data, selectedInitiative, initiativeData, initiatives, progress, xDataKey]);

  const showInitiativeFilter = initiatives && initiatives.length > 0;

  return (
    <div>
      {/* Initiative filter tabs */}
      {showInitiativeFilter && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setSelectedInitiative('combined')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedInitiative === 'combined'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Combined
          </button>
          {initiatives.map(init => (
            <button
              key={init.id}
              onClick={() => setSelectedInitiative(init.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedInitiative === init.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {init.name}
              <span className="ml-1 opacity-60">({init.progress}%)</span>
            </button>
          ))}
        </div>
      )}

      {/* Series toggles */}
      <div className="flex flex-wrap gap-3 mb-3">
        {series.map(s => (
          <button
            key={s.key}
            onClick={() => handleLegendClick(s.key)}
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity"
            style={{ opacity: visibleSeries[s.key] ? 1 : 0.35 }}
          >
            <span
              className="inline-block w-4 h-0.5 rounded-full"
              style={{
                backgroundColor: s.color,
                height: s.key === 'idealAdoption' ? 2 : 3,
              }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xDataKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              fontSize: '12px',
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            onClick={(e: any) => handleLegendClick(e.dataKey)}
          />
          {series.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2}
              dot={false}
              hide={!visibleSeries[s.key]}
              opacity={s.key === 'idealAdoption' ? 0.55 : 1}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdoptionTrendChart;

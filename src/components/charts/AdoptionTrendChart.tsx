import React, { useState, useCallback } from 'react';
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
  { key: 'idealAdoption', label: 'Ideal Adoption', color: 'hsl(var(--amp-adoption))', strokeWidth: 2, defaultVisible: true },
  { key: 'participation', label: 'Participation', color: 'hsl(var(--amp-participation))', strokeWidth: 1.5, defaultVisible: true },
  { key: 'ownership', label: 'Ownership', color: 'hsl(var(--amp-ownership))', strokeWidth: 1.5, defaultVisible: true },
  { key: 'confidence', label: 'Confidence', color: 'hsl(var(--amp-confidence))', strokeWidth: 1.5, defaultVisible: true },
];

interface AdoptionTrendChartProps {
  data: any[];
  height?: number;
  series?: SeriesConfig[];
  xDataKey?: string;
}

const AdoptionTrendChart: React.FC<AdoptionTrendChartProps> = ({
  data,
  height = 280,
  series = DEFAULT_SERIES,
  xDataKey = 'week',
}) => {
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map(s => [s.key, s.defaultVisible !== false]))
  );

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);

  return (
    <div>
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
        <LineChart data={data}>
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
              // Ideal adoption is now a solid line with lower opacity
              opacity={s.key === 'idealAdoption' ? 0.55 : 1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdoptionTrendChart;

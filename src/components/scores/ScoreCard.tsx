import React from 'react';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  label: string;
  score: number;
  color: 'participation' | 'ownership' | 'confidence' | 'adoption';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  trend?: number;
}

const colorMap = {
  participation: { bg: 'bg-amp-participation/10', text: 'text-amp-participation', bar: 'bg-amp-participation' },
  ownership: { bg: 'bg-amp-ownership/10', text: 'text-amp-ownership', bar: 'bg-amp-ownership' },
  confidence: { bg: 'bg-amp-confidence/10', text: 'text-amp-confidence', bar: 'bg-amp-confidence' },
  adoption: { bg: 'bg-amp-adoption/10', text: 'text-amp-adoption', bar: 'bg-amp-adoption' },
};

export const ScoreCard: React.FC<ScoreCardProps> = ({ label, score, color, size = 'md', showLabel = true, trend }) => {
  const c = colorMap[color];
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div className={cn("rounded-xl bg-card border border-border amp-shadow-card", sizeClasses[size])}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {trend !== undefined && (
            <span className={cn("text-xs font-semibold", trend >= 0 ? 'text-amp-success' : 'text-amp-risk')}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
      <div className="flex items-end gap-2 mb-3">
        <span className={cn("font-heading font-bold", c.text, size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl')}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground mb-1">/ 100</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", c.bar)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export const ScoreRow: React.FC<{ label: string; score: number; color: string }> = ({ label, score, color }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-muted-foreground w-24">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
    </div>
    <span className="text-xs font-semibold w-8 text-right">{score}</span>
  </div>
);

interface AdoptionScoreRingProps {
  score: number;
  size?: number;
  idealScore?: number;
}

export const AdoptionScoreRing: React.FC<AdoptionScoreRingProps> = ({ score, size = 120, idealScore }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const idealOffset = idealScore !== undefined ? circumference - (idealScore / 100) * circumference : circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--amp-adoption))';
    if (s >= 60) return 'hsl(var(--amp-info))';
    if (s >= 40) return 'hsl(var(--amp-warning))';
    return 'hsl(var(--amp-risk))';
  };

  const showIdeal = idealScore !== undefined && idealScore > 0;

  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" />
          {/* Ideal score arc (dashed, behind) */}
          {showIdeal && (
            <circle
              cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
              stroke="hsl(var(--amp-adoption))" fill="none"
              strokeLinecap="round"
              strokeDasharray={`${strokeWidth * 0.8} ${strokeWidth * 0.6}`}
              strokeDashoffset={idealOffset}
              opacity={0.25}
              className="transition-all duration-1000"
            />
          )}
          {/* Actual score arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
            stroke={getColor(score)} fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span className="font-heading font-bold text-foreground" style={{ fontSize: size * 0.28 }}>{score}</span>
          {size >= 80 && <span className="text-muted-foreground uppercase tracking-wider" style={{ fontSize: Math.max(7, size * 0.09) }}>Adoption</span>}
        </div>
      </div>
      {/* Ideal score legend below */}
      {showIdeal && size >= 80 && (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(score) }} />
            <span className="text-[10px] text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amp-adoption/25 border border-amp-adoption/40" />
            <span className="text-[10px] text-muted-foreground">Ideal {idealScore}</span>
          </div>
        </div>
      )}
    </div>
  );
};

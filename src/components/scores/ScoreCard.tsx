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

export const AdoptionScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--amp-adoption))';
    if (s >= 60) return 'hsl(var(--amp-info))';
    if (s >= 40) return 'hsl(var(--amp-warning))';
    return 'hsl(var(--amp-risk))';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
          stroke={getColor(score)} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading font-bold text-2xl text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Adoption</span>
      </div>
    </div>
  );
};

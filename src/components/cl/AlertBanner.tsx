import React from "react";
import { X, Lightbulb, TrendingUp, AlertTriangle, Info, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AlertVariant = "info" | "success" | "warning" | "risk" | "tip";

interface AlertBannerProps {
  variant?: AlertVariant;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const variantMap: Record<
  AlertVariant,
  { icon: React.ComponentType<{ className?: string }>; iconBg: string; iconFg: string }
> = {
  info:    { icon: Info,           iconBg: "chip-info",    iconFg: "text-current" },
  success: { icon: Trophy,         iconBg: "chip-success", iconFg: "text-current" },
  warning: { icon: AlertTriangle,  iconBg: "chip-warning", iconFg: "text-current" },
  risk:    { icon: AlertTriangle,  iconBg: "chip-risk",    iconFg: "text-current" },
  tip:     { icon: Lightbulb,      iconBg: "chip-warning", iconFg: "text-current" },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  variant = "tip",
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  onDismiss,
  className,
}) => {
  const v = variantMap[variant];
  const Icon = v.icon;

  return (
    <div className={cn("cl-card p-4 md:p-5 flex items-center gap-4", className)}>
      <div className={cn("shrink-0 w-12 h-12 rounded-xl flex items-center justify-center", v.iconBg)}>
        {icon ?? <Icon className={cn("w-5 h-5", v.iconFg)} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm md:text-base">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {ctaLabel && onCta && (
          <Button onClick={onCta} className="bg-nav text-nav-foreground hover:bg-nav/90 rounded-full h-9 px-4 text-xs">
            {ctaLabel}
          </Button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 h-9 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            Dismiss <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

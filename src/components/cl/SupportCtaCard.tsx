import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroPattern } from "./HeroPattern";

interface SupportCtaCardProps {
  eyebrow?: string;
  title: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export const SupportCtaCard: React.FC<SupportCtaCardProps> = ({
  eyebrow = "Need help?",
  title,
  ctaLabel = "Contact us",
  onCta,
  className,
}) => (
  <div className={cn("relative overflow-hidden cl-support-card rounded-2xl p-6 text-white", className)}>
    <HeroPattern className="absolute inset-y-0 right-0 w-1/2 pointer-events-none" opacity={0.18} />
    <div className="relative">
      <p className="text-xs uppercase tracking-[0.14em] text-white/70 font-semibold">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-bold leading-snug max-w-[240px]">{title}</h3>
      {onCta && (
        <button
          onClick={onCta}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors"
        >
          {ctaLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

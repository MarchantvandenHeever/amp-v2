import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HeroPattern } from "./HeroPattern";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  back?: boolean | (() => void);
  detailsLabel?: string;
  onDetails?: () => void;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  back,
  detailsLabel = "View details",
  onDetails,
  size = "md",
  children,
  className,
}) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof back === "function") return back();
    navigate(-1);
  };

  const heights = {
    sm: "min-h-[140px] py-6",
    md: "min-h-[200px] py-8",
    lg: "min-h-[260px] py-10",
  };

  return (
    <div className={cn("relative overflow-hidden cl-hero rounded-b-3xl", heights[size], className)}>
      <HeroPattern className="absolute inset-y-0 right-0 w-2/3 pointer-events-none" />
      <div className="relative px-6 md:px-10 max-w-7xl mx-auto h-full flex flex-col justify-center">
        {back && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-full pl-3 pr-4 py-1.5 mb-4 w-fit transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-white/75 max-w-2xl text-sm md:text-base leading-relaxed">{subtitle}</p>
        )}
        {onDetails && (
          <button
            onClick={onDetails}
            className="mt-3 text-sm text-white/85 hover:text-white underline underline-offset-4 w-fit"
          >
            {detailsLabel}
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

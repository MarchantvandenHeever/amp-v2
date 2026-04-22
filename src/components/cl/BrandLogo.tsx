import React from "react";
import { cn } from "@/lib/utils";
import ampLogo from "@/assets/amp-logo-official.jpg";

interface BrandLogoProps {
  className?: string;
  /** Kept for API compatibility. The official logo already includes the wordmark. */
  variant?: "full" | "mark";
  /** Kept for API compatibility. */
  tone?: "dark" | "light";
}

/**
 * Official AMP logo — used as-is everywhere in the app.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ className }) => {
  return (
    <img
      src={ampLogo}
      alt="amp — powered by change logic"
      className={cn("h-10 w-auto object-contain select-none", className)}
      draggable={false}
    />
  );
};

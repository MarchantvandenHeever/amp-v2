import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Render variant. `mark` shows only the shield. `full` shows shield + wordmark. */
  variant?: "full" | "mark";
  /** Force light or dark wordmark. Defaults to dark for use on white headers. */
  tone?: "dark" | "light";
}

/**
 * Change Logic-style brand mark:
 *   stacked orange + yellow shield/leaf with "change logic" wordmark.
 * Inline SVG so it themes cleanly and stays crisp at any size.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  variant = "full",
  tone = "dark",
}) => {
  const wordColor = tone === "light" ? "hsl(var(--nav-foreground))" : "hsl(var(--foreground))";
  const subColor = tone === "light" ? "hsl(var(--nav-muted))" : "hsl(var(--muted-foreground))";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg viewBox="0 0 40 44" width="34" height="38" aria-hidden="true">
        {/* Yellow back leaf */}
        <path
          d="M20 2 C 30 6, 36 14, 36 24 C 36 34, 28 40, 20 42 C 12 40, 4 34, 4 24 C 4 14, 10 6, 20 2 Z"
          fill="hsl(38 95% 58%)"
        />
        {/* Orange front leaf, offset */}
        <path
          d="M22 6 C 32 9, 38 17, 38 26 C 38 35, 30 41, 22 43 C 18 41, 14 38, 12 34 C 18 32, 24 26, 24 18 C 24 14, 23 10, 22 6 Z"
          fill="hsl(22 90% 56%)"
        />
        {/* Inner highlight stroke */}
        <path
          d="M16 14 C 22 16, 26 22, 26 30"
          stroke="hsl(0 0% 100% / 0.35)"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {variant === "full" && (
        <div className="leading-[1.05]">
          <div
            style={{ color: wordColor, fontFamily: "var(--font-heading)" }}
            className="text-[15px] font-bold tracking-tight"
          >
            change
          </div>
          <div
            style={{ color: subColor, fontFamily: "var(--font-heading)" }}
            className="text-[15px] font-bold tracking-tight"
          >
            logic<sup className="text-[8px] font-medium ml-0.5">CL</sup>
          </div>
        </div>
      )}
    </div>
  );
};

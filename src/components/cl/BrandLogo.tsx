import React from "react";
import { cn } from "@/lib/utils";
import ampLogo from "@/assets/amp-logo-orange-transparent.png";

interface BrandLogoProps {
  className?: string;
  /** Render variant. `mark` shows only the logo image. `full` shows logo + wordmark. */
  variant?: "full" | "mark";
  /** Force light or dark wordmark. Defaults to dark for use on white headers. */
  tone?: "dark" | "light";
}

/**
 * AMP brand mark — uses the official AMP logo image.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  variant = "full",
  tone = "dark",
}) => {
  const wordColor = tone === "light" ? "hsl(var(--nav-foreground))" : "hsl(var(--foreground))";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <img
        src={ampLogo}
        alt="AMP"
        width={38}
        height={38}
        className="h-9 w-auto object-contain"
        draggable={false}
      />

      {variant === "full" && (
        <div
          style={{ color: wordColor, fontFamily: "var(--font-heading)" }}
          className="text-[18px] font-bold tracking-tight leading-none"
        >
          AMP
        </div>
      )}
    </div>
  );
};

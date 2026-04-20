import React from "react";
import { cn } from "@/lib/utils";

interface IconCircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "dark";
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const variantMap = {
  ghost: "bg-transparent text-muted-foreground hover:bg-muted",
  outline: "border border-border bg-card text-muted-foreground hover:bg-muted",
  dark: "bg-nav text-nav-foreground hover:bg-nav/90",
};

export const IconCircleButton = React.forwardRef<HTMLButtonElement, IconCircleButtonProps>(
  ({ icon, size = "md", variant = "outline", className, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors shrink-0",
        sizeMap[size],
        variantMap[variant],
        className,
      )}
    >
      {icon}
    </button>
  ),
);
IconCircleButton.displayName = "IconCircleButton";

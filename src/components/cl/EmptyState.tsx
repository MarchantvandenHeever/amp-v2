import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-10 px-6", className)}>
    <div className="w-14 h-14 rounded-2xl chip-neutral flex items-center justify-center mb-4">
      {icon ?? <Inbox className="w-6 h-6" />}
    </div>
    <p className="font-semibold text-foreground">{title}</p>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

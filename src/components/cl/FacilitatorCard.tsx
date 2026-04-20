import React from "react";
import { cn } from "@/lib/utils";

export interface Facilitator {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
}

interface FacilitatorCardProps {
  title?: string;
  facilitators: Facilitator[];
  className?: string;
}

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const FacilitatorCard: React.FC<FacilitatorCardProps> = ({
  title = "Your facilitators",
  facilitators,
  className,
}) => (
  <section className={cn("cl-card p-6", className)}>
    <h3 className="cl-section-label mb-5">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {facilitators.map((f) => (
        <div key={f.id} className="flex items-center gap-3">
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">
              {initials(f.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm">{f.name}</p>
            <p className="text-xs text-muted-foreground">{f.role}</p>
            <a
              href={`mailto:${f.email}`}
              className="text-xs text-primary underline underline-offset-2 hover:text-primary-soft truncate inline-block max-w-[220px]"
            >
              {f.email}
            </a>
          </div>
        </div>
      ))}
    </div>
  </section>
);

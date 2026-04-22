import React from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Gauge, Brain, Shield, Database, ChevronRight } from "lucide-react";

const cards = [
  { title: "Scoring configuration", description: "Tune AMP weights, half-life, and rolling windows.", to: "/admin/scoring", icon: Gauge },
  { title: "AI change log", description: "Review and roll back AI-driven journey changes.", to: "/manage/ai-changelog", icon: Brain },
  { title: "User roles & access", description: "Manage who can see and edit what.", to: "/admin/users", icon: Shield },
  { title: "Customers", description: "Manage tenant organizations.", to: "/admin/customers", icon: Database },
];

const SettingsPage: React.FC = () => (
  <AppLayout>
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide configuration and administration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="bg-card border border-border rounded-xl p-5 amp-shadow-card hover:border-primary/40 transition-colors flex items-start gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <c.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{c.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default SettingsPage;

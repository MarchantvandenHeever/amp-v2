import React from "react";
import { EndUserHeader } from "./EndUserHeader";
import { SupportAgentChat } from "@/components/ai/SupportAgentChat";

/**
 * Layout for end users (and the Help page).
 * - White top header with brand + utility actions (no left sidebar)
 * - Light page background
 * - Dark footer "Powered by Change Logic"
 */
export const EndUserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <EndUserHeader />
    <main className="flex-1">{children}</main>
    <footer className="bg-nav text-nav-muted text-xs py-4 text-center font-medium tracking-wide">
      Powered by Change Logic {new Date().getFullYear()}
    </footer>
    <SupportAgentChat />
  </div>
);

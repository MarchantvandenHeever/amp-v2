import React from "react";
import { Bell, Settings, LogOut } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/cl/BrandLogo";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/cl/WorkspaceTabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

/**
 * Top header used by EndUserLayout (and the Help page).
 * - White bar with brand + utility actions
 * - Navy workspace tabs underneath: Individual / Team / Help
 *   Team is hidden for `end_user`. All roles see Individual + Help.
 */
export const EndUserHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const canSeeTeam =
    !!user && (user.role === "team_lead" || user.role === "change_manager" || user.role === "super_admin");

  const tabs: (WorkspaceTab & { path: string })[] = [
    { key: "individual", label: "Individual workspace", path: "/dashboard" },
    ...(canSeeTeam ? [{ key: "team", label: "Team workspace", path: "/team" }] : []),
    { key: "help", label: "Get help", path: "/help" },
  ];

  const activeKey =
    pathname.startsWith("/team") ? "team" :
    pathname.startsWith("/help") ? "help" :
    "individual";

  return (
    <>
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 md:px-10">
        <Link to="/dashboard" aria-label="Change Logic home">
          <BrandLogo />
        </Link>

        <div className="flex items-center gap-2">
          <button
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amp-risk rounded-full" />
          </button>
          <button
            aria-label="Settings"
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Settings className="w-[18px] h-[18px] text-foreground" />
          </button>

          <Link
            to="/help"
            className="ml-2 inline-flex items-center rounded-full bg-nav text-nav-foreground hover:bg-nav/90 px-5 h-10 text-sm font-medium transition-colors"
          >
            Get help
          </Link>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 w-10 h-10 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <WorkspaceTabs
        tabs={tabs}
        active={activeKey}
        onChange={(key) => {
          const t = tabs.find((x) => x.key === key);
          if (t) navigate(t.path);
        }}
      />
    </>
  );
};

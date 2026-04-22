import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ListChecks, CalendarDays, Trophy, Flame, Star, Clock } from "lucide-react";
import { isToday, isTomorrow, isThisWeek, parseISO, format } from "date-fns";

import { EndUserLayout } from "@/components/layout/EndUserLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useJourneys,
  useAllJourneyItems,
  useAnnouncements,
  useInitiatives,
  getTierFromPoints,
} from "@/hooks/useSupabaseData";
import { useIdealAdoptionScore } from "@/hooks/useIdealAdoptionScore";
import { TaskDetailModal } from "@/components/journey/TaskDetailModal";

import {
  PageHero,
  KpiTile,
  AdoptionScoreCard,
  AlertBanner,
  ProjectSummaryCard,
  RightRailPanel,
  TaskCard,
  EmptyState,
} from "@/components/cl";

const parseDurationMinutes = (d?: string | null): number => {
  if (!d) return 5;
  const m = d.match(/(\d+)/);
  const num = m ? parseInt(m[1]) : 5;
  if (d.includes("hour") || d.includes("hr")) return num * 60;
  return num;
};

const formatTime = (mins: number) => {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
};

const EndUserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: journeys, isLoading: loadingJourneys } = useJourneys();
  const { data: allItems, isLoading: loadingItems } = useAllJourneyItems();
  const { data: announcements } = useAnnouncements();
  const { data: initiatives } = useInitiatives();
  const { idealScore } = useIdealAdoptionScore(user?.id);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Combined time-progress p (used by ideal score badge / labels only).
  // Scores from auth context are already AMP `_dashboard` (p-weighted) values.
  const currentTP = useMemo(() => {
    const active = initiatives?.filter((i) => i.status === "active") || [];
    const starts = active.map((i) => i.start_date).filter(Boolean) as string[];
    const ends = active.map((i) => i.end_date).filter(Boolean) as string[];
    if (!starts.length || !ends.length) return 1;
    const earliest = Math.min(...starts.map((s) => new Date(s).getTime()));
    const latest = Math.max(...ends.map((s) => new Date(s).getTime()));
    const total = latest - earliest;
    if (total <= 0) return 1;
    return Math.min(1, (Date.now() - earliest) / total);
  }, [initiatives]);

  const { todayTasks, upcomingTasks, todayTimeMinutes } = useMemo(() => {
    if (!allItems) return { todayTasks: [], upcomingTasks: [], todayTimeMinutes: 0 };
    const active = allItems.filter((i) => i.status === "available" || i.status === "in_progress");
    const today: typeof active = [];
    const upcoming: typeof active = [];
    active.forEach((item) => {
      if (!item.due_date) return;
      try {
        const d = parseISO(item.due_date);
        if (isToday(d)) today.push(item);
        else if (isTomorrow(d) || isThisWeek(d)) upcoming.push(item);
      } catch {}
    });
    const tt = today.reduce((s, i) => s + parseDurationMinutes(i.duration), 0);
    return { todayTasks: today.slice(0, 6), upcomingTasks: upcoming.slice(0, 5), todayTimeMinutes: tt };
  }, [allItems]);

  if (!user) return null;

  if (loadingJourneys || loadingItems) {
    return (
      <EndUserLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </EndUserLayout>
    );
  }

  const adoption = Math.round(user.scores.adoption || 0);
  const tier = getTierFromPoints(user.points);
  const activeJourneys = journeys?.filter((j) => j.status === "active") || [];
  const activeAnnouncement = announcements?.find((a) => a.active);
  const totalCompleted = allItems?.filter((i) => i.status === "completed").length || 0;
  const totalItems = allItems?.length || 0;

  const dimensions = [
    { key: "participation", label: "Participation", value: user.scores.participation, color: "hsl(var(--amp-participation))" },
    { key: "ownership", label: "Ownership", value: user.scores.ownership, color: "hsl(var(--amp-ownership))" },
    { key: "confidence", label: "Confidence", value: user.scores.confidence, color: "hsl(var(--amp-confidence))" },
  ];

  return (
    <EndUserLayout>
      <PageHero
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle="Small actions build embedment. Here's where to focus today."
        size="md"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile icon={<Star className="w-6 h-6" />} iconTone="warning" value={user.points} label="Points" />
          <KpiTile icon={<Flame className="w-6 h-6" />} iconTone="risk" value={user.streak} label="Day streak" />
          <KpiTile icon={<ListChecks className="w-6 h-6" />} iconTone="info" value={todayTasks.length} label="Tasks today" />
          <KpiTile icon={<Trophy className="w-6 h-6" />} iconTone="success" value={`${totalCompleted}/${totalItems}`} label="Items done" />
        </div>

        {activeAnnouncement && (
          <AlertBanner
            variant={activeAnnouncement.type === "celebration" ? "success" : activeAnnouncement.type === "action" ? "warning" : "info"}
            title={activeAnnouncement.title}
            description={activeAnnouncement.message || undefined}
          />
        )}

        {/* Main grid: adoption + projects | right rail */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6 min-w-0">
            <AdoptionScoreCard
              dimensions={dimensions}
              adoption={adoption}
              lastUpdatedLabel={`${tier} · updated today`}
            />

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="cl-section-label">Your active projects</h2>
                <button
                  onClick={() => navigate("/dashboard/initiatives")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all →
                </button>
              </div>
              {activeJourneys.length === 0 ? (
                <EmptyState
                  title="No active projects yet"
                  description="When a change manager assigns you to a journey, it will show up here."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJourneys.slice(0, 4).map((journey) => {
                    const items = allItems?.filter((i) => i.journey_id === journey.id) || [];
                    const total = items.length;
                    const completed = items.filter((i) => i.status === "completed").length;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const pending = items.filter((i) => i.status === "available" || i.status === "in_progress").length;
                    const overdue = items.filter((i) => {
                      if (!i.due_date || i.status === "completed" || i.status === "locked") return false;
                      try {
                        return parseISO(i.due_date).getTime() < Date.now();
                      } catch {
                        return false;
                      }
                    }).length;
                    return (
                      <ProjectSummaryCard
                        key={journey.id}
                        title={journey.name}
                        description={journey.description || undefined}
                        adoptionScore={adoption}
                        progress={progress}
                        pendingTasks={pending}
                        overdueTasks={overdue}
                        members={[{ id: user.id, name: user.name }]}
                        totalMembers={1}
                        onView={() => navigate("/dashboard/initiatives")}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <RightRailPanel
              title="Tasks for today"
              meta={
                todayTasks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{formatTime(todayTimeMinutes)} of focus</span>
                  </div>
                )
              }
            >
              {todayTasks.length === 0 ? (
                <EmptyState title="All caught up" description="No tasks scheduled for today." />
              ) : (
                <div className="space-y-2.5">
                  {todayTasks.map((item) => (
                    <TaskCard
                      key={item.id}
                      title={item.title}
                      chips={[
                        { label: item.type.replace("_", " "), tone: "neutral" },
                        ...(item.duration ? [{ label: item.duration, tone: "info" as const }] : []),
                        ...(item.status === "in_progress" ? [{ label: "In progress", tone: "warning" as const }] : []),
                      ]}
                      onOpen={() => setSelectedTask(item)}
                    />
                  ))}
                </div>
              )}
            </RightRailPanel>

            {upcomingTasks.length > 0 && (
              <RightRailPanel title="Coming up">
                <ul className="space-y-2">
                  {upcomingTasks.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setSelectedTask(item)}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                        {item.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(item.due_date), "MMM d")}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </RightRailPanel>
            )}
          </aside>
        </div>
      </div>

      <TaskDetailModal
        item={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />
    </EndUserLayout>
  );
};

export default EndUserDashboard;

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { parseISO, format, isPast } from "date-fns";

import { EndUserLayout } from "@/components/layout/EndUserLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInitiatives,
  useJourneys,
  useAllJourneyItems,
  useJourneyPhases,
} from "@/hooks/useSupabaseData";
import { TaskDetailModal } from "@/components/journey/TaskDetailModal";

import {
  PageHero,
  JourneyTimeline,
  SegmentedTabs,
  TaskCard,
  RightRailPanel,
  EmptyState,
  StatusChip,
  type JourneyStepData,
  type ChipTone,
} from "@/components/cl";

const statusToTone = (status: string): ChipTone => {
  switch (status) {
    case "completed": return "success";
    case "in_progress": return "warning";
    case "available": return "info";
    case "locked": return "neutral";
    default: return "neutral";
  }
};

const phaseStatusToStep = (s: string): JourneyStepData["status"] => {
  if (s === "complete" || s === "completed") return "complete";
  if (s === "active" || s === "in_progress") return "active";
  if (s === "risk" || s === "at_risk") return "risk";
  return "upcoming";
};

const MyInitiatives: React.FC = () => {
  const { user } = useAuth();
  const { data: initiatives, isLoading: li } = useInitiatives();
  const { data: journeys, isLoading: lj } = useJourneys();
  const { data: allItems, isLoading: lit } = useAllJourneyItems();
  const { data: allPhases } = useJourneyPhases();

  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [taskTab, setTaskTab] = useState<"todo" | "complete">("todo");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const activeJourneys = useMemo(
    () => (journeys || []).filter((j) => j.status === "active" || j.status === "in_progress"),
    [journeys],
  );

  const currentJourney = useMemo(() => {
    if (activeJourneyId) return activeJourneys.find((j) => j.id === activeJourneyId) ?? activeJourneys[0];
    return activeJourneys[0];
  }, [activeJourneys, activeJourneyId]);

  useEffect(() => {
    if (!currentJourney) {
      setActiveJourneyId(null);
      return;
    }

    setActiveJourneyId((prev) => {
      if (prev && activeJourneys.some((journey) => journey.id === prev)) return prev;
      return currentJourney.id;
    });
  }, [activeJourneys, currentJourney]);

  const currentInitiative = useMemo(
    () => initiatives?.find((i) => i.id === currentJourney?.initiative_id),
    [initiatives, currentJourney],
  );

  const currentJourneyItems = useMemo(
    () => (allItems || []).filter((i) => i.journey_id === currentJourney?.id),
    [allItems, currentJourney],
  );

  const itemsById = useMemo(
    () => new Map(currentJourneyItems.map((item) => [item.id, item])),
    [currentJourneyItems],
  );

  const journeyItems = useMemo(() => {
    return currentJourneyItems.map((item) => {
      const predecessor = item.predecessor_id ? itemsById.get(item.predecessor_id) : null;
      const predecessorComplete = predecessor ? predecessor.status === "completed" : true;
      const derivedStatus =
        item.status === "completed"
          ? "completed"
          : predecessorComplete
            ? item.status === "locked"
              ? "available"
              : item.status
            : "locked";

      return {
        ...item,
        status: derivedStatus,
      };
    });
  }, [currentJourneyItems, itemsById]);

  const selectedTask = useMemo(
    () => journeyItems.find((item) => item.id === selectedTaskId) ?? null,
    [journeyItems, selectedTaskId],
  );

  const journeyPhases = useMemo(
    () =>
      (allPhases || [])
        .filter((p) => p.journey_id === currentJourney?.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    [allPhases, currentJourney],
  );

  const doneItems = useMemo(
    () => journeyItems.filter((i) => i.status === "completed"),
    [journeyItems],
  );

  const todoItems = useMemo(
    () => journeyItems.filter((i) => i.status !== "completed"),
    [journeyItems],
  );

  const availableItems = useMemo(
    () => todoItems.filter((i) => i.status === "available" || i.status === "in_progress"),
    [todoItems],
  );

  const lockedItems = useMemo(
    () => todoItems.filter((i) => i.status === "locked"),
    [todoItems],
  );

  const mandatoryLeft = useMemo(
    () => availableItems.filter((i) => i.mandatory).length,
    [availableItems],
  );

  const derivedProgress = useMemo(() => {
    if (journeyItems.length === 0) return 0;

    const weightedTotal = journeyItems.reduce((sum, item) => sum + Math.max(item.weight || 1, 1), 0);
    const weightedDone = doneItems.reduce((sum, item) => sum + Math.max(item.weight || 1, 1), 0);

    return weightedTotal > 0 ? Math.round((weightedDone / weightedTotal) * 100) : 0;
  }, [journeyItems, doneItems]);

  const timelineSteps: JourneyStepData[] = useMemo(() => {
    if (journeyPhases.length === 0) {
      return [
        {
          id: currentJourney?.id ?? "all",
          title: currentJourney?.name ?? "Journey",
          description: currentJourney?.description ?? undefined,
          status: derivedProgress === 100 ? "complete" : journeyItems.length > 0 ? "active" : "upcoming",
          progress: derivedProgress,
        },
      ];
    }

    return journeyPhases.map((phase) => {
      const phaseItems = journeyItems.filter((item) => item.phase_id === phase.id);
      const phaseCompleted = phaseItems.filter((item) => item.status === "completed");
      const phaseWeightTotal = phaseItems.reduce((sum, item) => sum + Math.max(item.weight || 1, 1), 0);
      const phaseWeightDone = phaseCompleted.reduce((sum, item) => sum + Math.max(item.weight || 1, 1), 0);
      const progress = phaseWeightTotal > 0 ? Math.round((phaseWeightDone / phaseWeightTotal) * 100) : 0;

      return {
        id: phase.id,
        title: phase.name,
        description: phase.description ?? undefined,
        status: progress === 100 ? "complete" : progress > 0 ? "active" : phaseStatusToStep(phase.status),
        start: phase.start_date ? format(parseISO(phase.start_date), "MMM d, yyyy") : undefined,
        end: phase.end_date ? format(parseISO(phase.end_date), "MMM d, yyyy") : undefined,
        progress,
      };
    });
  }, [journeyPhases, journeyItems, currentJourney, derivedProgress]);

  if (!user) return null;

  if (li || lj || lit) {
    return (
      <EndUserLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </EndUserLayout>
    );
  }

  const tasksToRender = taskTab === "todo" ? todoItems : doneItems;

  return (
    <EndUserLayout>
      <PageHero
        title={currentInitiative?.name ?? currentJourney?.name ?? "Your initiatives"}
        subtitle={
          currentInitiative?.description ??
          currentJourney?.description ??
          "Track your active workstreams and complete tasks step by step."
        }
        size="md"
      />

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 space-y-6">
        {activeJourneys.length === 0 ? (
          <EmptyState
            title="No active initiatives yet"
            description="When a change manager assigns you to a journey, it will show up here."
          />
        ) : (
          <>
            {activeJourneys.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {activeJourneys.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setActiveJourneyId(j.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      currentJourney?.id === j.id
                        ? "bg-nav text-nav-foreground border-nav"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {j.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6 min-w-0">
                <section className="cl-card p-6 md:p-7">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="cl-section-label">Your journey</h3>
                    <StatusChip tone="info">
                      {doneItems.length}/{journeyItems.length || 0} tasks done
                    </StatusChip>
                  </div>
                  <JourneyTimeline steps={timelineSteps} />
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="cl-section-label">Your tasks</h2>
                    <SegmentedTabs
                      tabs={[
                        { key: "todo", label: "To do", count: todoItems.length },
                        { key: "complete", label: "Complete", count: doneItems.length },
                      ]}
                      active={taskTab}
                      onChange={(k) => setTaskTab(k as "todo" | "complete")}
                    />
                  </div>

                  {tasksToRender.length === 0 ? (
                    <EmptyState
                      title={taskTab === "todo" ? "Nothing to do right now" : "No completed tasks yet"}
                      description={
                        taskTab === "todo"
                          ? "You're all caught up on this journey."
                          : "Finish a task and it will show up here."
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tasksToRender.map((item) => {
                        const overdue =
                          taskTab === "todo" &&
                          item.status !== "locked" &&
                          item.status !== "completed" &&
                          !!item.due_date &&
                          (() => {
                            try {
                              return isPast(parseISO(item.due_date));
                            } catch {
                              return false;
                            }
                          })();

                        const chips = [
                          { label: item.type.replace(/_/g, " "), tone: "neutral" as ChipTone },
                          ...(item.duration ? [{ label: item.duration, tone: "info" as ChipTone }] : []),
                          ...(item.mandatory ? [{ label: "Required", tone: "warning" as ChipTone }] : []),
                          ...(item.status === "in_progress"
                            ? [{ label: "In progress", tone: "warning" as ChipTone }]
                            : []),
                          ...(overdue ? [{ label: "Overdue", tone: "risk" as ChipTone }] : []),
                          { label: item.status.replace(/_/g, " "), tone: statusToTone(item.status) },
                        ];

                        return (
                          <TaskCard
                            key={item.id}
                            title={item.title}
                            chips={chips}
                            locked={false}
                            onOpen={() => setSelectedTaskId(item.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <RightRailPanel
                  title="Journey overview"
                  meta={
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {derivedProgress}% complete
                    </div>
                  }
                >
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Phases</span>
                      <span className="font-semibold">{journeyPhases.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Total tasks</span>
                      <span className="font-semibold">{journeyItems.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-semibold text-amp-success">{doneItems.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Ready now</span>
                      <span className="font-semibold">{availableItems.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Blocked</span>
                      <span className="font-semibold">{lockedItems.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Mandatory left</span>
                      <span className="font-semibold">{mandatoryLeft}</span>
                    </li>
                  </ul>
                </RightRailPanel>

                {currentInitiative && (
                  <RightRailPanel title="Initiative">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-foreground">{currentInitiative.name}</p>
                      {currentInitiative.description && (
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {currentInitiative.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <StatusChip tone="dark">{currentInitiative.phase}</StatusChip>
                        <StatusChip tone="neutral">{currentInitiative.status}</StatusChip>
                      </div>
                    </div>
                  </RightRailPanel>
                )}
              </aside>
            </div>
          </>
        )}
      </div>

      <TaskDetailModal
        item={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </EndUserLayout>
  );
};

export default MyInitiatives;

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Settings2 } from "lucide-react";
import { AiMentionIllustration } from "@/client/components/EmptyIllustrations";
import { toast } from "sonner";
import { EmptyState } from "@/client/components/EmptyState";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import {
  saveAiVisibilityTracker,
  setAiVisibilitySchedule,
} from "@/serverFunctions/ai-visibility";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  aiBrandLabel,
  type AiPrompt,
  type AiRun,
  type AiTrackerState,
} from "@/shared/ai-visibility";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { PromptList } from "./PromptList";
import { CompetitorsTab } from "./CompetitorsTab";
import { CitationsTab } from "./CitationsTab";
import {
  PromptTrackingTabs,
  type PromptTrackingTab,
} from "./PromptTrackingTabs";
import { TrackerEditor, TrackerEditorMode } from "./TrackerEditor";
import { prefetchRunNowCost, TrackingCostReview } from "./TrackingCostReview";
import { VisibilityTrend } from "./VisibilityTrend";
import { RunStatusLine } from "./RunStatusLine";
import { TrackingScheduleSummary } from "./TrackingScheduleSummary";
import { PromptEditor, TrackerPatchReview } from "./TrackerPatchReview";
import {
  AiQueryError,
  aiVisibilityKey,
  useAiRunProgress,
  useAiVisibilityTracker,
} from "./shared";
import type { ProjectMarket } from "@/client/features/projects/types";
import { DEFAULT_LOCATION_CODE } from "@/shared/keyword-locations";
import { scheduleLabel } from "@/shared/rank-tracking";
import { InsufficientCreditsError } from "@/client/features/billing/InsufficientCreditsError";

export function PromptTrackingPage({
  projectId,
  tab,
}: {
  projectId: string;
  tab: PromptTrackingTab;
}) {
  const query = useAiVisibilityTracker(projectId);
  const projects = useQuery(projectsQueryOptions());
  const project = projects.data?.find((item) => item.id === projectId);
  if (query.isPending) return <SkeletonPageContent />;
  if (query.isError)
    return (
      <AiQueryError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  // Brand details always come from the shared project.
  if (projects.isPending) return <SkeletonPageContent />;
  if (projects.isError)
    return (
      <AiQueryError
        error={projects.error}
        retry={() => {
          void projects.refetch();
        }}
      />
    );
  return (
    <PromptTrackingContent
      projectId={projectId}
      tab={tab}
      state={query.data}
      defaultMarket={{
        locationCode: project?.locationCode ?? DEFAULT_LOCATION_CODE,
        languageCode: project?.languageCode ?? "en",
      }}
    />
  );
}

function PromptTrackingContent({
  projectId,
  tab,
  state,
  defaultMarket,
}: {
  projectId: string;
  tab: PromptTrackingTab;
  state: AiTrackerState;
  defaultMarket: ProjectMarket;
}) {
  const queryClient = useQueryClient();
  const [editorMode, setEditorMode] = useState<TrackerEditorMode | null>(null);
  const [managingTracking, setManagingTracking] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AiRun | null>(null);
  const [costMode, setCostMode] = useState<"check" | "schedule" | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
  const [change, setChange] = useState<AiTrackerPatch | null>(null);
  // A run started here shows at once, before the tracker refetch lists it.
  // Once listed, the newest run wins, so a later scheduled run takes over.
  const currentRun =
    (selectedRun && !state.recentRuns.some((run) => run.id === selectedRun.id)
      ? selectedRun
      : state.recentRuns[0]) ?? null;
  const progress = useAiRunProgress(projectId, currentRun);
  const tracker = state.tracker;
  const ownBrand = state.brands.find((brand) => brand.own);
  const activePrompts = state.prompts.filter(
    (prompt) => !prompt.archived && !prompt.paused,
  );
  const saved = (next: AiTrackerState, run?: AiRun, closeEditor = true) => {
    queryClient.setQueryData([...aiVisibilityKey(projectId), "tracker"], next);
    void queryClient.invalidateQueries({
      queryKey: aiVisibilityKey(projectId),
    });
    if (closeEditor) setEditorMode(null);
    setEditingPrompt(null);
    setChange(null);
    if (run) setSelectedRun(run);
    toast.success(
      run ? "Ejecución iniciada" : "Seguimiento de prompts guardado",
    );
  };
  const pauseSchedule = useMutation({
    mutationFn: () =>
      setAiVisibilitySchedule({
        data: { projectId, enabled: false },
      }),
    onSuccess: (result) => {
      saved(result.state);
      setManagingTracking(false);
      toast.success("Seguimiento en pausa");
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const reduceTracking = useMutation({
    mutationFn: (patch: AiTrackerPatch) =>
      saveAiVisibilityTracker({ data: { projectId, ...patch } }),
    onSuccess: (result) => saved(result.state),
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const busy =
    progress.run?.status === "running" || progress.run?.status === "queued";
  // Price Run now on load and again when the active prompts or engines
  // change, so the dialog opens on the current price.
  const engines = state.engines.join();
  useEffect(() => {
    if (tracker) prefetchRunNowCost(queryClient, projectId, tracker);
  }, [queryClient, projectId, tracker, activePrompts.length, engines]);
  const schedule = tracker && (
    <TrackingScheduleSummary
      tracker={tracker}
      canSchedule={
        state.providerConfigured &&
        !busy &&
        (tracker.enabled || activePrompts.length > 0)
      }
      pausePending={pauseSchedule.isPending}
      onPause={() => pauseSchedule.mutate()}
      onSchedule={() => {
        setEditorMode(null);
        setManagingTracking(false);
        setCostMode("schedule");
      }}
    />
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Seguimiento de prompts"
        description="Sigue los prompts que tus clientes usan con la IA y mira dónde se menciona o cita tu negocio."
      />
      {!state.configured ? (
        <EmptyState
          variant="card"
          illustration={<AiMentionIllustration />}
          title="Añade las preguntas que tus clientes hacen a la IA"
          description="Las ejecutamos de forma programada y te mostramos qué respuestas te mencionan o te citan."
          action={
            <Button onClick={() => setEditorMode(TrackerEditorMode.Prompts)}>
              <Plus />
              Añadir prompts
            </Button>
          }
        />
      ) : (
        <>
          {progress.error && <AiQueryError error={progress.error} />}
          {/* One card, like rank tracking: tracker header, trend, then tabs. */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="space-y-3 px-4 pt-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {ownBrand && aiBrandLabel(ownBrand)}
                    </h2>
                    <Badge variant={tracker?.enabled ? "success" : "secondary"}>
                      {tracker?.enabled
                        ? `Seguimiento ${scheduleLabel(tracker.scheduleInterval).toLowerCase()}`
                        : "En pausa"}
                    </Badge>
                  </div>
                </div>
                {/* Next to the schedule badge, like Configure in rank tracking. */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditorMode(TrackerEditorMode.Settings)}
                  >
                    <Settings2 />
                    Ajustes de seguimiento
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      !state.providerConfigured ||
                      activePrompts.length === 0 ||
                      busy
                    }
                    onClick={() => setCostMode("check")}
                  >
                    <Play />
                    Ejecutar ahora
                  </Button>
                </div>
              </div>
              <RunStatusLine run={progress.run} tracker={tracker} />
              {/* A notice about the last check is stale while one runs. */}
              {busy ? null : tracker?.lastSkipReason ===
                "INSUFFICIENT_CREDITS" ? (
                <InsufficientCreditsError variant="inline" />
              ) : (
                tracker?.lastSkipReason && (
                  <p className="text-xs text-warning">
                    Último aviso de programación: {tracker.lastSkipReason}
                  </p>
                )
              )}
            </div>
            <VisibilityTrend projectId={projectId} collecting={busy} />
            <PromptTrackingTabs projectId={projectId} tab={tab} />
            {tab === "prompts" && (
              <PromptList
                key={currentRun?.id ?? "new"}
                projectId={projectId}
                state={state}
                currentRun={currentRun}
                collecting={busy}
                onSetup={() => setEditorMode(TrackerEditorMode.Prompts)}
                onEdit={setEditingPrompt}
                onReduce={(patch) => reduceTracking.mutate(patch)}
                onReview={setChange}
                reducePending={reduceTracking.isPending}
              />
            )}
            {tab === "competitors" && (
              <CompetitorsTab
                projectId={projectId}
                state={state}
                runId={currentRun?.id}
                collecting={busy}
              />
            )}
            {tab === "citations" && (
              <CitationsTab
                key={currentRun?.id ?? "new"}
                projectId={projectId}
                state={state}
                runId={currentRun?.id}
                collecting={busy}
              />
            )}
          </div>
        </>
      )}
      {editorMode && (
        <TrackerEditor
          projectId={projectId}
          state={state}
          defaultMarket={defaultMarket}
          mode={editorMode}
          open={!managingTracking}
          schedule={schedule}
          onManageTracking={() => setManagingTracking(true)}
          onClose={() => setEditorMode(null)}
          onSaved={saved}
        />
      )}
      {managingTracking && (
        <TrackerEditor
          projectId={projectId}
          state={state}
          defaultMarket={defaultMarket}
          mode={TrackerEditorMode.Settings}
          schedule={schedule}
          onClose={() => setManagingTracking(false)}
          onSaved={(next, run) => {
            saved(next, run, false);
            setManagingTracking(false);
          }}
        />
      )}
      {costMode && tracker && (
        <TrackingCostReview
          projectId={projectId}
          tracker={tracker}
          mode={costMode}
          onClose={() => setCostMode(null)}
          onStarted={(run) => {
            setCostMode(null);
            setSelectedRun(run);
            void queryClient.invalidateQueries({
              queryKey: aiVisibilityKey(projectId),
            });
            toast.success(
              run
                ? "Ejecución iniciada"
                : tracker.enabled
                  ? "Programación del seguimiento guardada"
                  : "Seguimiento programado",
            );
          }}
        />
      )}
      {editingPrompt && (
        <PromptEditor
          prompt={editingPrompt}
          state={state}
          pending={reduceTracking.isPending}
          onClose={() => setEditingPrompt(null)}
          onReview={(patch) => {
            setEditingPrompt(null);
            setChange(patch);
          }}
          onMove={(patch) => reduceTracking.mutate(patch)}
        />
      )}
      {change && (
        <TrackerPatchReview
          projectId={projectId}
          state={state}
          patch={change}
          onClose={() => setChange(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}

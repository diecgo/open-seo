import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { QueryError } from "@/client/components/QueryState";
import { Spinner } from "@/client/components/Spinner";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Progress } from "@/client/components/ui/progress";
import {
  getAiResearchSetup,
  getAiVisibilityRun,
  getAiVisibilityTracker,
  getAiVisibilityTrend,
  getAiVisibilityResults,
  listAiResearchKeywords,
} from "@/serverFunctions/ai-visibility";
import type { AiRun, AiTrackerState } from "@/shared/ai-visibility";

export const aiVisibilityKey = (projectId: string) => [
  "aiVisibility",
  projectId,
];

const isRunPending = (run: AiRun | null | undefined) =>
  run?.status === "running" || run?.status === "queued";

export const aiTrackerQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "tracker"],
    queryFn: async ({ client, queryKey }) => {
      const before = client.getQueryData<AiTrackerState>(queryKey);
      const state = await getAiVisibilityTracker({ data: { projectId } });
      // Answers, trend and sources read while a run was collecting are
      // incomplete, wherever they were read (a hover preload, another tab), so
      // the read that first sees the run finish refreshes them.
      const finished = state.recentRuns.some(
        (run) =>
          !isRunPending(run) &&
          before?.recentRuns.some(
            (prior) => prior.id === run.id && isRunPending(prior),
          ),
      );
      if (finished) {
        void client.invalidateQueries({
          queryKey: [...aiVisibilityKey(projectId), "results"],
        });
        void client.invalidateQueries({
          queryKey: [...aiVisibilityKey(projectId), "sources"],
        });
      }
      return state;
    },
    // Fresh enough that a page mounting right after its loader read it, or
    // after a hover preload, does not read it again.
    staleTime: 10_000,
  });

export const aiResearchSetupQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "researchSetup"],
    queryFn: () => getAiResearchSetup({ data: { projectId } }),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });

export const aiResearchKeywordsQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "researchKeywords"],
    queryFn: () => listAiResearchKeywords({ data: { projectId } }),
  });

type AiTrendDays = 7 | 28 | 90;

/** Long enough to show a trend on a weekly schedule. */
export const DEFAULT_AI_TREND_DAYS: AiTrendDays = 28;

export const aiTrendQueryOptions = (projectId: string, days: AiTrendDays) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "results", "trend", days],
    queryFn: () => getAiVisibilityTrend({ data: { projectId, days } }),
  });

/** Every answer in a run, so each prompt can show its per-engine result. */
export const aiRunResultsQueryOptions = (
  projectId: string,
  runId: string | undefined,
) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "results", "all", runId],
    queryFn: async () => {
      const result = await getAiVisibilityResults({
        data: { projectId, runId, branded: "all" },
      });
      return result.rows;
    },
    enabled: Boolean(runId),
  });

export const aiPromptHistoryQueryOptions = (
  projectId: string,
  promptId: string,
) =>
  queryOptions({
    queryKey: [...aiVisibilityKey(projectId), "results", "history", promptId],
    // Read every answer of the latest 50 runs so engine ordering cannot hide
    // a newer execution from the selector.
    queryFn: () =>
      getAiVisibilityResults({
        data: { projectId, promptId, includeHistory: true, branded: "all" },
      }),
  });

export function useAiVisibilityTracker(projectId: string) {
  return useQuery(aiTrackerQueryOptions(projectId));
}

export function useAiRunProgress(projectId: string, initialRun: AiRun | null) {
  const queryClient = useQueryClient();
  const runId = initialRun?.id;
  const query = useQuery({
    queryKey: [...aiVisibilityKey(projectId), "run", runId],
    queryFn: () => getAiVisibilityRun({ data: { projectId, runId: runId! } }),
    enabled: Boolean(runId),
    initialData: initialRun ?? undefined,
    // A finished run never changes, so only an unfinished one is read again.
    staleTime: (current) => (isRunPending(current.state.data) ? 0 : Infinity),
    refetchInterval: (current) => {
      const run = current.state.data;
      return run && isRunPending(run)
        ? Math.max(4, run.pollAfterSeconds) * 1000
        : false;
    },
  });
  const run = query.data ?? initialRun;
  const previous = useRef(run);
  // Refresh what an unfinished run writes as its answers arrive. Once it
  // finishes, re-read the tracker, which sees the finish and refreshes the
  // answers itself. Polls that bring nothing new keep the same run object, and
  // a run that was already finished when the page opened changes nothing, so
  // neither reads anything again.
  useEffect(() => {
    const before = previous.current;
    previous.current = run;
    if (run === before || run?.id !== before?.id || !isRunPending(before))
      return;
    if (!isRunPending(run)) {
      void queryClient.invalidateQueries({
        queryKey: [...aiVisibilityKey(projectId), "tracker"],
      });
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: [...aiVisibilityKey(projectId), "results"],
    });
    void queryClient.invalidateQueries({
      queryKey: [...aiVisibilityKey(projectId), "sources"],
    });
  }, [projectId, queryClient, run]);
  return { run, error: query.error };
}

export function AiQueryError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <QueryError
      error={error}
      fallback="No se pudo cargar la visibilidad en IA. Inténtalo de nuevo."
      onRetry={retry}
    />
  );
}

export function AiLoading() {
  return (
    <div className="flex justify-center py-12">
      <Spinner size="sm" label="Cargando visibilidad en IA…" />
    </div>
  );
}

const AI_MATCH_LABELS = {
  Mentioned: ["Mencionada", "No mencionada"],
  Cited: ["Citada", "No citada"],
} as const;

const AI_RUN_STATUS_LABELS: Record<AiRun["status"], string> = {
  queued: "En cola",
  running: "En curso",
  completed: "Completada",
  partial: "Parcial",
  failed: "Fallida",
};

export function AiMatchBadge({
  value,
  positive = "Mentioned",
}: {
  value: boolean;
  positive?: "Mentioned" | "Cited";
}) {
  return (
    <Badge variant={value ? "success" : "secondary"}>
      {AI_MATCH_LABELS[positive][value ? 0 : 1]}
    </Badge>
  );
}

export function aiDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No disponible" : date.toLocaleString();
}

export function aiRate(count: number, eligible: number) {
  return eligible ? `${Math.round((count / eligible) * 100)}%` : "—";
}

export function aiMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);
}

export function AiRunStatus({ run }: { run: AiRun }) {
  const pending = run.status === "running" || run.status === "queued";
  return (
    <div
      className="space-y-2 rounded-lg border bg-card px-4 py-3 border-border"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {run.trigger === "manual"
            ? "Ejecución puntual"
            : run.trigger === "baseline"
              ? "Primera ejecución programada"
              : "Ejecución programada"}
          <Badge variant="secondary">{AI_RUN_STATUS_LABELS[run.status]}</Badge>
        </span>
        <span className="text-xs text-muted-foreground">
          {aiDate(run.createdAt)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          {run.completed} de {run.expected} respuestas recopiladas
        </span>
        {run.pending > 0 && <span>{run.pending} pendientes</span>}
        {run.failed > 0 && (
          <span className="text-destructive">{run.failed} fallidas</span>
        )}
      </div>
      {pending && (
        <Progress value={run.completed + run.failed} max={run.expected || 1} />
      )}
    </div>
  );
}

/** The paid-plan gate's way out on AI pages: tracking needs only credits. */
export function PromptTrackingWithoutUpgradeButton({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <Button
      size="lg"
      variant="outline"
      nativeButton={false}
      render={<Link to="/p/$projectId/ai-visibility" params={{ projectId }} />}
    >
      Usar Seguimiento de prompts sin mejorar el plan
    </Button>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { LOCATIONS } from "@/client/features/keywords/locations";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  addTrackingKeywords,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import { MAX_TRACKED_KEYWORD_LENGTH } from "@/shared/rank-tracking";

/** Adds the given queries to one of the project's rank trackers. */
export function TrackRankingsMenu({
  projectId,
  queries,
  onAdded,
  variant = "ghost",
}: {
  projectId: string;
  queries: string[];
  onAdded?: () => void;
  /** Ghost in the bulk action bar; outline beside other outline buttons. */
  variant?: "ghost" | "outline";
}) {
  const queryClient = useQueryClient();
  const configsQuery = useQuery({
    queryKey: ["rankTrackingConfigs", projectId],
    queryFn: () => getRankTrackingConfigs({ data: { projectId } }),
  });
  const configs = configsQuery.data ?? [];

  const add = useMutation({
    mutationFn: (configId: string) =>
      addTrackingKeywords({
        data: {
          projectId,
          configId,
          // One overlong query would fail the whole request.
          keywords: queries.filter(
            (query) => query.length <= MAX_TRACKED_KEYWORD_LENGTH,
          ),
        },
      }),
    onSuccess: (result, configId) => {
      captureClientEvent("rank_tracking:keywords_add", {
        source_feature: "search_performance",
        keyword_count: result.added,
      });
      for (const key of [
        "rankTrackingResults",
        "rankTrackingCostEstimate",
        "rankTrackingLatestRun",
      ]) {
        void queryClient.invalidateQueries({
          queryKey: [key, projectId, configId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingConfigSummaries", projectId],
      });
      const skipped = queries.length - result.added;
      toast.success(
        `Siguiendo ${result.added} palabra${result.added === 1 ? "" : "s"} clave nueva${result.added === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} ya seguidas, demasiado largas o por encima del límite)` : ""}`,
      );
      if (result.checkScheduledSoon) {
        toast.info(
          "La comprobación programada de la próxima hora incluye estas palabras clave",
        );
      }
      onAdded?.();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant={variant} size="sm" pending={add.isPending} />}
      >
        {add.isPending ? null : <LineChart data-icon="inline-start" />}
        Seguir posiciones
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-72">
        {configs.length === 0 ? (
          <DropdownMenuItem
            disabled={configsQuery.isLoading}
            render={
              <Link to="/p/$projectId/rank-tracking" params={{ projectId }} />
            }
          >
            {configsQuery.isLoading
              ? "Cargando rastreadores…"
              : "Configura primero el seguimiento de posiciones"}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel>Añadir al rastreador</DropdownMenuLabel>
            {configs.map((config) => (
              <DropdownMenuItem
                key={config.id}
                disabled={add.isPending}
                onClick={() => add.mutate(config.id)}
              >
                <span className="truncate">
                  {config.domain} ·{" "}
                  {config.locationName ??
                    LOCATIONS[config.locationCode] ??
                    config.locationCode}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

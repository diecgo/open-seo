import { GoogleSearchConsoleLogo } from "@/client/features/integrations/GoogleProductLogos";
import { startAudit } from "@/serverFunctions/audit";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { Globe, LoaderCircle, ScanSearch } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { Progress } from "@/client/components/ui/progress";
import { Button } from "@/client/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { Check } from "lucide-react";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { SeverityBadge } from "@/client/features/audit/shared";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import { DateRangeSelect } from "@/client/features/search-performance/SearchPerformanceSelects";
import {
  cardMetaClass,
  cardTableClass,
  formatDay,
  moreDetailsClass,
} from "@/client/features/dashboard/cardParts";
import {
  MetricRow,
  MetricsSkeleton,
  TrendChart,
} from "@/client/features/dashboard/DashboardMetrics";
import { percentChange } from "@/client/components/MetricsTable";
import type { ChartConfig } from "@/client/components/ui/chart";
import type { SearchPerformanceDateRange } from "@/types/schemas/search-performance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { DashboardAuditSummary } from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

const gscChartConfig = {
  clicks: { label: "Clics", color: "var(--chart-1)" },
  impressions: { label: "Impresiones", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function GscCard({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const [dateRange, setDateRange] =
    useState<SearchPerformanceDateRange>("last_28_days");
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId, siteUrl, dateRange],
    queryFn: () =>
      getSearchPerformanceReport({ data: { projectId, dateRange } }),
    enabled: connected,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
  const report = reportQuery.data;

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (report && !report.connected)) {
    return (
      <div id="connect-gsc">
        <GoogleConnectionCard provider="gsc" projectId={projectId} prominent />
      </div>
    );
  }

  return (
    <CardShell
      title="GSC"
      icon={<GoogleSearchConsoleLogo className="size-5" />}
      titleInfo={
        <DateRangeSelect
          value={dateRange}
          onChange={setDateRange}
          triggerClassName="border-transparent bg-transparent pl-2 pr-1.5 font-normal text-muted-foreground hover:bg-foreground/5"
        />
      }
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          search={{ range: dateRange }}
          className={moreDetailsClass}
        >
          Ver Search Console
        </Link>
      }
    >
      {reportQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          No se han podido cargar los datos de Search Console. Vuelve a
          intentarlo en un rato.
        </p>
      ) : !report ? (
        <MetricsSkeleton />
      ) : (
        <div
          className={`flex flex-1 flex-col gap-4 transition-opacity ${reportQuery.isPlaceholderData ? "opacity-50" : ""}`}
        >
          <MetricRow
            metrics={[
              {
                label: "Clics",
                value: formatCount(report.totals.clicks),
                change: percentChange(
                  report.totals.clicks,
                  report.prevTotals.clicks,
                ),
                dotClass: "bg-chart-1",
              },
              {
                label: "Impresiones",
                value: formatCount(report.totals.impressions),
                change: percentChange(
                  report.totals.impressions,
                  report.prevTotals.impressions,
                ),
                dotClass: "bg-chart-2",
              },
              {
                label: "CTR",
                value: formatCtr(report.totals.ctr),
                change: null,
              },
              {
                label: "Posición media",
                value: formatPosition(report.totals.position),
                change: null,
              },
            ]}
          />
          {report.totals.impressions > 0 ? (
            <TrendChart config={gscChartConfig} data={report.trend} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay datos de búsqueda para este periodo.
            </p>
          )}
        </div>
      )}
    </CardShell>
  );
}

const siteHealthIcon = <Globe className="size-5" />;

export function AuditHealthCard({
  projectId,
  audit,
  domain,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
  domain: string | null;
}) {
  const queryClient = useQueryClient();
  const scan = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: `https://${domain}`,
          maxPages: 50,
          renderJavaScript: true,
        },
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["dashboardOverview", projectId],
      }),
    meta: { errorToast: false },
  });
  if (!audit)
    return (
      <CardShell title="Salud del sitio" icon={siteHealthIcon}>
        <EmptyState
          variant="plain"
          icon={ScanSearch}
          title="Descubre qué está frenando tu sitio web"
          description="Analiza hasta 50 páginas en busca de enlaces rotos, títulos ausentes y páginas que Google no puede indexar."
          action={
            <>
              {domain ? (
                <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
                  {scan.isPending
                    ? "Iniciando análisis…"
                    : "Analizar mi sitio web"}
                </Button>
              ) : (
                <Button
                  nativeButton={false}
                  render={
                    <Link to="/p/$projectId/settings" params={{ projectId }} />
                  }
                >
                  Añade tu sitio web
                </Button>
              )}
              {scan.isError && (
                <QueryError
                  error={scan.error}
                  fallback="No se ha podido iniciar el análisis"
                />
              )}
            </>
          }
        />
      </CardShell>
    );

  if (audit.status === "running") {
    const isLighthouse = audit.currentPhase === "lighthouse";
    const isFinalizing = audit.currentPhase === "finalizing";
    const checked = isLighthouse
      ? audit.lighthouseCompleted + audit.lighthouseFailed
      : audit.pagesCrawled;
    const total = isLighthouse ? audit.lighthouseTotal : audit.pagesTotal;
    // A running crawl has at most a partial issue list, and an empty one is
    // not the same as a healthy site, so show progress instead.
    return (
      <CardShell
        title="Salud del sitio"
        icon={siteHealthIcon}
        action={
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            search={{ auditId: audit.id }}
            className={moreDetailsClass}
          >
            Ver progreso
          </Link>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
          <h3 className="font-medium">
            {isLighthouse
              ? "Ejecutando comprobaciones de Lighthouse"
              : isFinalizing
                ? "Preparando tus resultados"
                : audit.currentPhase === "discovery"
                  ? "Buscando páginas para analizar"
                  : "Analizando tu sitio web"}
          </h3>
          {!isFinalizing && (
            <Progress
              className="w-full max-w-xs"
              value={checked}
              max={total || 1}
              aria-label={
                isLighthouse
                  ? "Comprobaciones de Lighthouse"
                  : "Páginas rastreadas"
              }
            />
          )}
          <p className="text-sm text-muted-foreground tabular-nums">
            {isLighthouse
              ? `${checked} de ${total} comprobaciones${audit.lighthouseFailed > 0 ? ` (${audit.lighthouseFailed} fallidas)` : ""}`
              : isFinalizing
                ? `${audit.pagesCrawled} páginas rastreadas. Terminando tu informe.`
                : `${checked} de hasta ${total} páginas rastreadas`}
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="Salud del sitio"
      icon={siteHealthIcon}
      titleInfo={
        audit.status === "completed" ? (
          <span className={cardMetaClass}>
            {audit.pagesCrawled} páginas revisadas ·{" "}
            {formatDay(audit.startedAt)}
          </span>
        ) : null
      }
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          search={{ auditId: audit.id, tab: "issues" }}
          className={moreDetailsClass}
        >
          Revisar problemas
        </Link>
      }
    >
      {audit.status === "failed" && (
        <p className="mb-4 text-sm text-destructive">
          El último análisis no terminó. Revisa los resultados o vuelve a
          intentarlo.
        </p>
      )}
      {audit.topIssues.length === 0 ? (
        audit.status === "completed" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success" />
            No se han encontrado problemas: tu sitio está en buena forma.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Vuelve a lanzar la auditoría para ver los problemas.
          </p>
        )
      ) : (
        <Table className={cardTableClass}>
          <TableHeader>
            <TableRow>
              <TableHead>Problema</TableHead>
              <TableHead>Gravedad</TableHead>
              <TableHead className="text-right">Páginas afectadas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.topIssues.map((issue) => (
              <TableRow key={issue.issueType}>
                <TableCell>
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={issue.severity}>
                    {issue.severity === "critical"
                      ? "Crítico"
                      : issue.severity === "warning"
                        ? "Aviso"
                        : "Información"}
                  </SeverityBadge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {issue.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardShell>
  );
}

import { MetricsTable } from "@/client/components/MetricsTable";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";
import { HelpLabel } from "@/client/components/HelpLabel";
import {
  BacklinksNewLostChart,
  BacklinksTrendChart,
} from "./BacklinksPageCharts";
import type { BacklinksOverviewData } from "./backlinksPageTypes";
import { formatRelativeTimestamp } from "./backlinksPageUtils";

type SummaryStat = { label: string; value: string; description: string };

const SCOPE_NOTES: Partial<Record<BacklinksOverviewData["scope"], string>> = {
  exact_url:
    "Mostrando los enlaces entrantes de esta página exacta. Cambia el ámbito a Dominio o Subdominios para ver resultados de todo el sitio: los gráficos de tendencia necesitan uno de los dos.",
  subfolder:
    "Mostrando los enlaces entrantes que apuntan a esta subcarpeta. Los recuentos salen de los totales filtrados; el rango, las tendencias y el desglose de dominios de referencia necesitan el ámbito Dominio o Subdominios.",
};

export function BacklinksScopeAlert({
  scope,
}: {
  scope: BacklinksOverviewData["scope"];
}) {
  const note = SCOPE_NOTES[scope];
  if (!note) return null;
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">{note}</AlertDescription>
    </Alert>
  );
}

/** The header and overview sections at the top of the results card. */
export function BacklinksOverviewPanels({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold break-all">
            {data.displayTarget}
          </h2>
          <Badge variant="outline">{RESEARCH_SCOPE_LABELS[data.scope]}</Badge>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          Actualizado {formatRelativeTimestamp(data.fetchedAt)}
        </p>
      </div>
      <div className="px-4 pb-4">
        <OverviewGrid data={data} summaryStats={summaryStats} />
      </div>
    </>
  );
}

function OverviewGrid({
  data,
  summaryStats,
}: {
  data: BacklinksOverviewData;
  summaryStats: SummaryStat[];
}) {
  // Trend charts need history/live, which only takes a whole hostname.
  const domainScope = data.scope === "domain" || data.scope === "subdomains";

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${domainScope ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}
    >
      <div
        className={`w-full max-w-xl rounded-lg border border-border p-3 ${domainScope ? "md:col-span-2 xl:col-span-1" : ""}`}
      >
        <MetricsTable
          rows={summaryStats.map((item) => ({
            label: <HelpLabel label={item.label} helpText={item.description} />,
            value: item.value,
          }))}
        />
      </div>
      {domainScope ? (
        <>
          <TrendPanel
            title="Crecimiento de enlaces entrantes"
            description={
              data.scope === "domain"
                ? "Último año · Incluye subdominios"
                : "Enlaces entrantes y dominios de referencia en el último año"
            }
          >
            <BacklinksTrendChart data={data.trends} />
          </TrendPanel>
          <TrendPanel
            title="Nuevos frente a perdidos"
            description="Enlaces entrantes ganados y perdidos"
          >
            <BacklinksNewLostChart data={data.newLostTrends} />
          </TrendPanel>
        </>
      ) : null}
    </div>
  );
}

function TrendPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

import { useMemo, type MutableRefObject } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { makeSelectionColumn } from "@/client/components/table/DataTable";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { formatLocationLabel } from "@/shared/keyword-locations";
import {
  CompetitorPositionsCell,
  CpcCell,
  DeviceRankCell,
  DeviceUrlCell,
  SerpFeatureTags,
  VolumeCell,
} from "./RankTrackingTableParts";
import type { SelectionAnchor } from "@/client/components/table/tableSelection";

export const RANK_TRACKING_HEADER_CLASS =
  "text-xs uppercase tracking-wide text-muted-foreground";

const RIGHT_ALIGNED = {
  headerClassName: "text-right",
  cellClassName: "text-right tabular-nums",
} as const;

const HEADER_TOOLTIPS: Record<string, string> = {
  keyword: "El término de búsqueda que sigues en Google",
  volume: "Volumen de búsqueda mensual estimado según Google",
  kd: "Dificultad de la palabra clave (0-100): cuanto más alta, más cuesta posicionar",
  cpc: "Coste medio por clic en Google Ads (USD)",
  desktopPosition:
    "Posición actual en Google, con el cambio respecto al periodo de comparación",
  mobilePosition:
    "Posición actual en Google, con el cambio respecto al periodo de comparación",
  url: "La página de tu sitio que posiciona para esta palabra clave",
  competitors:
    "Dónde posicionan los competidores del proyecto en la misma página de resultados de Google, con su cambio respecto al periodo de comparación",
  serp: "Elementos especiales que aparecen en la página de resultados (p. ej., AI Overview, People Also Ask)",
};

// Local configs fetch volume scoped to the tracked city, so the header must
// say which number the user is looking at — national volume can overstate
// local demand by orders of magnitude.
function makeVolumeColumn(locationLabel?: string): ColumnDef<RankTrackingRow> {
  return {
    id: "volume",
    accessorFn: (row) => row.searchVolume ?? undefined,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label={locationLabel ? "Volumen local" : "Volumen"}
        title={
          locationLabel
            ? `Búsquedas mensuales estimadas en ${locationLabel} según Google Ads`
            : HEADER_TOOLTIPS.volume
        }
        className={RANK_TRACKING_HEADER_CLASS}
        align="right"
      />
    ),
    size: 90,
    cell: ({ getValue }) => (
      <VolumeCell value={getValue<number | undefined>() ?? null} />
    ),
    sortUndefined: "last",
    meta: RIGHT_ALIGNED,
  };
}

const kdColumn: ColumnDef<RankTrackingRow> = {
  id: "kd",
  accessorFn: (row) => row.keywordDifficulty ?? undefined,
  header: ({ column }) => (
    <SortableHeader
      column={column}
      label="KD"
      title={HEADER_TOOLTIPS.kd}
      className={RANK_TRACKING_HEADER_CLASS}
      align="right"
    />
  ),
  size: 70,
  cell: ({ getValue }) => (
    <ScoreBadge value={getValue<number | undefined>() ?? null} />
  ),
  sortUndefined: "last",
  meta: { headerClassName: "text-right", cellClassName: "text-right" },
};

const cpcColumn: ColumnDef<RankTrackingRow> = {
  id: "cpc",
  accessorFn: (row) => row.cpc ?? undefined,
  header: ({ column }) => (
    <SortableHeader
      column={column}
      label="CPC"
      title={HEADER_TOOLTIPS.cpc}
      className={RANK_TRACKING_HEADER_CLASS}
      align="right"
    />
  ),
  size: 80,
  cell: ({ getValue }) => (
    <CpcCell value={getValue<number | undefined>() ?? null} />
  ),
  sortUndefined: "last",
  meta: RIGHT_ALIGNED,
};

// Hidden column. The table always sorts by it first, so pinned keywords stay
// on top and each group keeps the sort the user picked.
export const PINNED_COLUMN_ID = "pinned";

const pinnedColumn: ColumnDef<RankTrackingRow> = {
  id: PINNED_COLUMN_ID,
  accessorFn: (row) => (row.pinned ? 0 : 1),
};

type RankTrackingActions = {
  selectAnchorRef: MutableRefObject<SelectionAnchor | null>;
  onKeywordClick: (row: RankTrackingRow) => void;
  onSetPinned: (vars: { trackingKeywordId: string; pinned: boolean }) => void;
};

function makeKeywordColumn(
  actions: RankTrackingActions | undefined,
): ColumnDef<RankTrackingRow> {
  return {
    id: "keyword",
    accessorKey: "keyword",
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Palabra clave"
        title={HEADER_TOOLTIPS.keyword}
        className={RANK_TRACKING_HEADER_CLASS}
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {actions ? (
          <>
            <PinButton
              pinned={row.original.pinned}
              onClick={() =>
                actions.onSetPinned({
                  trackingKeywordId: row.original.trackingKeywordId,
                  pinned: !row.original.pinned,
                })
              }
            />
            <button
              type="button"
              className="text-left font-medium decoration-dotted underline-offset-2 hover:underline"
              onClick={() => actions.onKeywordClick(row.original)}
              title="Ver historial de posiciones"
            >
              {row.original.keyword}
            </button>
          </>
        ) : (
          <span className="font-medium">{row.original.keyword}</span>
        )}
        {row.original.matchCase && (
          <Badge
            variant="secondary"
            size="sm"
            className="cursor-help"
            title="Se sigue tal como se escribió, sin pasar a minúsculas"
          >
            Aa
          </Badge>
        )}
      </div>
    ),
    sortingFn: "alphanumeric",
  };
}

function PinButton({
  pinned,
  onClick,
}: {
  pinned: boolean;
  onClick: () => void;
}) {
  const label = pinned
    ? "Dejar de fijar palabra clave"
    : "Fijar palabra clave arriba";
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pinned}
      title={label}
      className={
        pinned ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground"
      }
    >
      <Star className={pinned ? "fill-current" : undefined} />
    </Button>
  );
}

function makeDeviceColumn(
  device: "desktop" | "mobile",
): ColumnDef<RankTrackingRow> {
  const id = device === "desktop" ? "desktopPosition" : "mobilePosition";
  return {
    id,
    accessorFn: (row) => row[device].position ?? undefined,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Posición"
        title={HEADER_TOOLTIPS[id]}
        className={RANK_TRACKING_HEADER_CLASS}
      />
    ),
    size: 120,
    maxSize: 140,
    cell: ({ row }) => <DeviceRankCell result={row.original[device]} />,
    sortUndefined: "last",
  };
}

function makeUrlColumn(
  device: "desktop" | "mobile",
  domain: string,
): ColumnDef<RankTrackingRow> {
  return {
    id: device === "desktop" ? "desktopUrl" : "mobileUrl",
    enableSorting: false,
    header: () => (
      <span
        className="cursor-help text-xs font-medium tracking-wide uppercase text-muted-foreground"
        title={HEADER_TOOLTIPS.url}
      >
        URL
      </span>
    ),
    size: 240,
    cell: ({ row }) => (
      <DeviceUrlCell result={row.original[device]} domain={domain} />
    ),
  };
}

function makeCompetitorsColumn(
  device: "desktop" | "mobile",
): ColumnDef<RankTrackingRow> {
  return {
    id: device === "desktop" ? "desktopCompetitors" : "mobileCompetitors",
    enableSorting: false,
    header: () => (
      <span
        className="cursor-help text-xs font-medium tracking-wide uppercase text-muted-foreground"
        title={HEADER_TOOLTIPS.competitors}
      >
        Competidores
      </span>
    ),
    size: 240,
    cell: ({ row }) => (
      <CompetitorPositionsCell competitors={row.original[device].competitors} />
    ),
  };
}

function makeSerpColumn(
  device: "desktop" | "mobile",
): ColumnDef<RankTrackingRow> {
  return {
    id: device === "desktop" ? "desktopSerp" : "mobileSerp",
    enableSorting: false,
    header: () => (
      <span
        className="cursor-help text-xs font-medium tracking-wide uppercase text-muted-foreground"
        title={HEADER_TOOLTIPS.serp}
      >
        Elementos de la SERP
      </span>
    ),
    cell: ({ row }) => {
      const features = row.original[device].serpFeatures;
      if (features.length === 0) return null;
      return <SerpFeatureTags features={features} />;
    },
  };
}

/** Without `actions` the table is read-only: no selection, pins or history. */
export function useRankTrackingColumns(options: {
  showDesktop: boolean;
  showMobile: boolean;
  /** Adds each device's competitor positions; off when no row has any. */
  showCompetitors?: boolean;
  domain: string;
  actions?: RankTrackingActions;
  locationName?: string | null;
}): ColumnDef<RankTrackingRow>[] {
  const {
    showDesktop,
    showMobile,
    showCompetitors = false,
    domain,
    actions,
    locationName,
  } = options;
  const locationLabel = locationName
    ? formatLocationLabel(locationName, 2)
    : undefined;
  return useMemo(() => {
    const cols: ColumnDef<RankTrackingRow>[] = [pinnedColumn];
    if (actions) {
      cols.push(makeSelectionColumn<RankTrackingRow>(actions.selectAnchorRef));
    }
    cols.push(makeKeywordColumn(actions));
    if (showDesktop) {
      cols.push(makeDeviceColumn("desktop"));
      cols.push(makeUrlColumn("desktop", domain));
      if (showCompetitors) cols.push(makeCompetitorsColumn("desktop"));
    }
    if (showMobile) {
      cols.push(makeDeviceColumn("mobile"));
      cols.push(makeUrlColumn("mobile", domain));
      if (showCompetitors) cols.push(makeCompetitorsColumn("mobile"));
    }
    cols.push(makeVolumeColumn(locationLabel), kdColumn, cpcColumn);
    if (showDesktop) {
      cols.push(makeSerpColumn("desktop"));
    }
    if (showMobile) {
      cols.push(makeSerpColumn("mobile"));
    }
    return cols;
  }, [
    showDesktop,
    showMobile,
    showCompetitors,
    domain,
    actions,
    locationLabel,
  ]);
}

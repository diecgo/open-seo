import { createColumnHelper } from "@tanstack/react-table";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useMemo } from "react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  DataTable,
  useDataTable,
  type DataTableFrameProps,
} from "@/client/components/table/DataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HelpLabel } from "@/client/components/HelpLabel";
import type { ReferringDomainRow } from "./backlinksPageTypes";
import type { ReferringDomainsSortField } from "@/types/schemas/backlinks";
import {
  formatCompactDate,
  formatDecimal,
  formatNumber,
} from "./backlinksPageUtils";
import type { DomainRatings } from "./useAhrefsDomainRatings";

const columnHelper = createColumnHelper<ReferringDomainRow>();

// Column ids map to server-side sort fields; sorting re-queries DataForSEO
// across all referring domains, not just the loaded page.
const baseColumns = [
  columnHelper.accessor("domain", {
    id: "domain" satisfies ReferringDomainsSortField,
    meta: { cellClassName: "font-medium break-all" },
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Dominio"
        helpText="El sitio de referencia que enlaza a tu objetivo."
      />
    ),
    cell: ({ getValue }) => {
      const domain = getValue();
      if (!domain) return "-";
      return (
        <SafeExternalLink
          url={getDomainWebsiteHref(domain)}
          label={domain}
          className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline"
        />
      );
    },
  }),
  columnHelper.accessor("backlinks", {
    id: "backlinks" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Enlaces entrantes"
        helpText="Total de enlaces entrantes encontrados desde este dominio."
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("referringPages", {
    id: "referringPages" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Páginas de referencia"
        helpText="Páginas únicas de este dominio que enlazan a tu objetivo."
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("rank", {
    id: "rank" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Rango"
        helpText="Puntuación de autoridad del dominio de referencia."
      />
    ),
    cell: ({ getValue }) => formatNumber(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("spamScore", {
    id: "spamScore" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Spam"
        helpText="Puntuación de riesgo de spam de este dominio de referencia."
      />
    ),
    cell: ({ getValue }) => formatDecimal(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("firstSeen", {
    id: "firstSeen" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Primera detección"
        helpText="Cuándo se detectó por primera vez que este dominio enlazaba a tu objetivo."
      />
    ),
    cell: ({ getValue }) => formatCompactDate(getValue()),
    sortDescFirst: true,
  }),
  columnHelper.accessor("brokenBacklinks", {
    id: "brokenBacklinks" satisfies ReferringDomainsSortField,
    header: ({ column }) => (
      <SortableHeader
        column={column}
        label="Problemas"
        helpText="Número de enlaces rotos y páginas rotas asociados a este dominio."
      />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        <div>Enlaces rotos: {formatNumber(row.original.brokenBacklinks)}</div>
        <div className="text-muted-foreground">
          Páginas rotas: {formatNumber(row.original.brokenPages)}
        </div>
      </div>
    ),
    sortDescFirst: true,
  }),
];

/**
 * Columns for the referring domains table. When `domainRatings` is provided
 * (the user clicked "Ahrefs DR"), an Ahrefs DR column is inserted after Rank;
 * otherwise it stays hidden. DR is loaded client-side from Ahrefs, so it can't
 * participate in server-side sorting.
 */
function buildReferringDomainColumns(domainRatings: DomainRatings | null) {
  if (!domainRatings) return baseColumns;

  const ratings = domainRatings;
  const drColumn = columnHelper.display({
    id: "ahrefsDr",
    header: () => (
      <HelpLabel
        label="Ahrefs DR"
        helpText="Domain Rating de Ahrefs (0-100) de este dominio de referencia."
      />
    ),
    cell: ({ row }) => {
      const domain = row.original.domain;
      const dr = domain ? (ratings[domain] ?? null) : null;
      return dr == null ? "-" : formatDecimal(dr);
    },
  });

  const insertAt = baseColumns.findIndex((column) => column.id === "rank") + 1;
  return [
    ...baseColumns.slice(0, insertAt),
    drColumn,
    ...baseColumns.slice(insertAt),
  ];
}

function getDomainWebsiteHref(domain: string) {
  try {
    return new URL(domain).toString();
  } catch {
    return `https://${domain}`;
  }
}

export function ReferringDomainsTable({
  rows,
  domainRatings,
  sorting,
  onSortingChange,
  ...frame
}: DataTableFrameProps & {
  rows: ReferringDomainRow[];
  domainRatings: DomainRatings | null;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const columns = useMemo(
    () => buildReferringDomainColumns(domainRatings),
    [domainRatings],
  );

  const table = useDataTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  });

  return (
    <DataTable
      table={table}
      empty={{
        title:
          "No se han encontrado dominios de referencia para este objetivo.",
      }}
      {...frame}
    />
  );
}

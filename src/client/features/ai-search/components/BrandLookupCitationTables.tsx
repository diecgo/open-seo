import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles } from "lucide-react";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HelpLabel } from "@/client/components/HelpLabel";
import { ExpandableList } from "@/client/components/ExpandableList";
import { Badge } from "@/client/components/ui/badge";
import { buttonVariants } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { numericNullsLast } from "@/client/components/table/nullSafeSort";
import {
  formatCount,
  PLATFORM_DOT_CLASS,
  PLATFORM_SHORT_LABEL,
} from "@/client/features/ai-search/platformLabels";
import { formatUrlForDisplay } from "@/client/components/table/url";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type TopPageRow = BrandLookupResult["topPages"][number];
type TopQueryRow = BrandLookupResult["topQueries"][number];
type PlatformKey = TopPageRow["platform"];

/** Uppercase column header with a hover/focus popover explaining the column. */
function HeaderWithHelp({
  label,
  helpText,
}: {
  label: string;
  helpText: string;
}) {
  return (
    <span className="tracking-wider uppercase">
      <HelpLabel label={label} helpText={helpText} />
    </span>
  );
}

const PLATFORM_HELP =
  "Qué superficie de IA generó la respuesta: ChatGPT o Google AI Overview.";

/**
 * Platform indicator used only when a table actually spans >1 platform. A dot +
 * short label replaces the old full-width pill that repeated identically on
 * every row.
 */
function PlatformCell({ platform }: { platform: PlatformKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`size-1.5 rounded-full ${PLATFORM_DOT_CLASS[platform]}`}
      />
      {PLATFORM_SHORT_LABEL[platform]}
    </span>
  );
}

function urlPath(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const path = `${url.pathname}${url.search}`;
    return path === "/" ? "" : path;
  } catch {
    return "";
  }
}

function normalizeDomain(value: string): string {
  return value.replace(/^www\./i, "").toLowerCase();
}

/**
 * The lookup targets a domain with include_subdomains, so the target's own
 * pages can surface under any subdomain (docs.acme.com for acme.com) — those
 * must get the "You" badge too.
 */
function isTargetDomain(domain: string, targetDomain: string): boolean {
  const candidate = normalizeDomain(domain);
  const target = normalizeDomain(targetDomain);
  return candidate === target || candidate.endsWith(`.${target}`);
}

/** Domain-led cited page: bold domain + truncated path, links out. */
function PageUrlCell({
  row,
  targetDomain,
}: {
  row: TopPageRow;
  targetDomain: string | null;
}) {
  const path = urlPath(row.url);
  const isOwn =
    targetDomain != null &&
    row.domain != null &&
    isTargetDomain(row.domain, targetDomain);

  return (
    <a
      href={row.url}
      target="_blank"
      rel="noreferrer"
      className="group block max-w-xl"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-foreground group-hover:underline">
          {row.domain ?? formatUrlForDisplay(row.url)}
        </span>
        {isOwn ? <Badge size="sm">Tú</Badge> : null}
        <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
      </span>
      {path ? (
        <span className="block truncate text-xs text-muted-foreground">
          {path}
        </span>
      ) : null}
    </a>
  );
}

/**
 * The prompts (keywords) whose answers cited this page. Shows the top 3 inline;
 * if there are more, a "+N more" toggle reveals the rest. Each prompt links into
 * Prompt Explorer prefilled with it.
 */
function KeywordsCell({
  keywords,
  projectId,
  brand,
}: {
  keywords: TopPageRow["keywords"];
  projectId: string;
  brand: string;
}) {
  if (keywords.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <ExpandableList
      items={keywords}
      className="space-y-0.5"
      renderItem={(keyword) => (
        <li key={keyword.question}>
          <Link
            to="/p/$projectId/prompt-explorer"
            params={{ projectId }}
            search={{ q: keyword.question, hb: brand || undefined }}
            className="group/kw inline-flex items-baseline gap-2 text-xs"
            title="Ejecutar este prompt en el Explorador de prompts"
          >
            <span className="text-foreground/80 group-hover/kw:underline">
              {keyword.question}
            </span>
            <span
              className="shrink-0 text-muted-foreground tabular-nums"
              title="Volumen del prompt en la muestra obtenida"
            >
              {formatCount(keyword.aiSearchVolume)} vol.
            </span>
          </Link>
        </li>
      )}
    />
  );
}

const TEXT_CELL = "min-w-80 max-w-2xl align-top";
const NUMBER_CELL = "whitespace-nowrap text-right align-top";

const pagesHelper = createColumnHelper<TopPageRow>();
const queriesHelper = createColumnHelper<TopQueryRow>();

export function buildTopPagesColumns({
  showPlatform,
  targetDomain,
  projectId,
  brand,
}: {
  showPlatform: boolean;
  targetDomain: string | null;
  projectId: string;
  brand: string;
}) {
  return [
    pagesHelper.accessor("url", {
      id: "url",
      meta: { cellClassName: TEXT_CELL },
      header: () => (
        <HeaderWithHelp
          label="Fuente"
          helpText="Una página citada como fuente en respuestas de IA en las que aparece la marca o el dominio buscado."
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <PageUrlCell row={row.original} targetDomain={targetDomain} />
      ),
    }),
    ...(showPlatform
      ? [
          pagesHelper.accessor("platform", {
            id: "platform",
            meta: { cellClassName: "whitespace-nowrap align-top" },
            header: () => (
              <HeaderWithHelp label="Plataforma" helpText={PLATFORM_HELP} />
            ),
            enableSorting: false,
            cell: ({ getValue }) => <PlatformCell platform={getValue()} />,
          }),
        ]
      : []),
    pagesHelper.display({
      id: "keywords",
      meta: { cellClassName: "max-w-lg align-top" },
      header: () => (
        <HeaderWithHelp
          label="Citada por"
          helpText="Ejemplos de prompts de la muestra obtenida en los que se citó esta página."
        />
      ),
      cell: ({ row }) => (
        <KeywordsCell
          keywords={row.original.keywords}
          projectId={projectId}
          brand={brand}
        />
      ),
    }),
    pagesHelper.accessor("capturedVolume", {
      id: "capturedVolume",
      meta: { cellClassName: NUMBER_CELL },
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label="Vol. fuente"
          helpText="Demanda mensual estimada de prompts que DataForSEO indica para esta fuente citada, en los prompts en los que aparece la marca o el dominio buscado."
          align="right"
        />
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatCount(getValue())}</span>
      ),
      sortingFn: numericNullsLast,
      sortDescFirst: true,
    }),
  ];
}

export function buildTopQueriesColumns({
  showPlatform,
  projectId,
  brand,
}: {
  showPlatform: boolean;
  projectId: string;
  brand: string;
}) {
  return [
    queriesHelper.accessor("question", {
      id: "question",
      meta: { cellClassName: TEXT_CELL },
      header: () => (
        <HeaderWithHelp
          label="Consulta"
          helpText="Un prompt de usuario de la muestra cuya respuesta de IA citó la marca o el dominio buscado en su texto o en sus fuentes. Puede que el prompt no nombre la marca."
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <p className="break-words font-medium">{row.original.question}</p>
          {row.original.brandsMentioned.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Marcas: {row.original.brandsMentioned.slice(0, 5).join(", ")}
            </p>
          ) : null}
        </>
      ),
    }),
    ...(showPlatform
      ? [
          queriesHelper.accessor("platform", {
            id: "platform",
            meta: { cellClassName: "whitespace-nowrap align-top" },
            header: () => (
              <HeaderWithHelp label="Plataforma" helpText={PLATFORM_HELP} />
            ),
            enableSorting: false,
            cell: ({ getValue }) => <PlatformCell platform={getValue()} />,
          }),
        ]
      : []),
    queriesHelper.accessor("aiSearchVolume", {
      id: "aiSearchVolume",
      meta: { cellClassName: NUMBER_CELL },
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label="Vol. búsqueda IA"
          helpText="Demanda de búsqueda mensual estimada del tema de este prompt. Es demanda del prompt, no el número de menciones de la marca."
          align="right"
        />
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatCount(getValue())}</span>
      ),
      sortingFn: numericNullsLast,
      sortDescFirst: true,
    }),
    queriesHelper.display({
      id: "action",
      header: () => <span className="sr-only">Acciones</span>,
      meta: { cellClassName: "w-px whitespace-nowrap text-right align-top" },
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            delay={150}
            render={
              <Link
                to="/p/$projectId/prompt-explorer"
                params={{ projectId }}
                search={{ q: row.original.question, hb: brand || undefined }}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-xs",
                  className: "text-muted-foreground",
                })}
                aria-label="Ejecutar este prompt en el Explorador de prompts"
              />
            }
          >
            <Sparkles />
          </TooltipTrigger>
          <TooltipContent side="left">
            Ejecutar este prompt en el Explorador de prompts
          </TooltipContent>
        </Tooltip>
      ),
    }),
  ];
}

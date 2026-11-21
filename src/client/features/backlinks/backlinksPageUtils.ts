import type { BacklinksTab } from "@/types/schemas/backlinks";
import type { BacklinksOverviewData } from "./backlinksPageTypes";

export const TAB_DESCRIPTIONS: Record<BacklinksTab, string> = {
  backlinks:
    "Mira cada enlace que apunta a tu objetivo, con la página de origen, el texto ancla y las señales de calidad del enlace.",
  domains:
    "Mira los dominios únicos que enlazan a tu objetivo, agrupados por sitio en lugar de por enlace.",
  pages:
    "Descubre qué páginas del sitio objetivo atraen más enlaces entrantes y dominios de referencia.",
};

export function buildSummaryStats(data: BacklinksOverviewData | undefined) {
  if (!data) return [];

  return [
    {
      label: "Enlaces entrantes",
      value: formatNumber(data.summary.backlinks),
      description: "Total de enlaces que apuntan a este sitio o página.",
    },
    {
      label: "Dominios de referencia",
      value: formatNumber(data.summary.referringDomains),
      description: "Dominios únicos que enlazan a este sitio o página.",
    },
    {
      label: "Páginas de referencia",
      value: formatNumber(data.summary.referringPages),
      description: "Páginas únicas que enlazan a este sitio o página.",
    },
    {
      label: "Rango",
      value: formatNumber(data.summary.rank),
      description: "Puntuación de autoridad de DataForSEO (0-100).",
    },
    {
      label: "Puntuación de spam de enlaces entrantes",
      value: formatDecimal(data.summary.backlinksSpamScore),
      description: "Riesgo de spam estimado de los enlaces que apuntan aquí.",
    },
    {
      label: "Enlaces entrantes rotos",
      value: formatNumber(data.summary.brokenBacklinks),
      description: "Enlaces que apuntan a páginas rotas de aquí.",
    },
    {
      label: "Páginas rotas",
      value: formatNumber(data.summary.brokenPages),
      description:
        "Páginas rotas de aquí que siguen teniendo enlaces entrantes.",
    },
    {
      label: "Puntuación de spam del objetivo",
      value: formatDecimal(data.summary.targetSpamScore),
      description: "Riesgo de spam estimado de este sitio o página.",
    },
  ];
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatDecimal(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toFixed(value >= 100 ? 0 : 1);
}

export function formatTooltipValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return "-";
}

const DATE_ONLY = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

/**
 * A calendar date, read in the reader's own timezone.
 *
 * `new Date("2026-03-01")` is UTC midnight, and rendering that with
 * `toLocaleDateString` shows the day before anywhere west of UTC: the whole of
 * the Americas sees "Feb 28". These values are calendar dates rather than
 * instants — `normalizeHistoryDate` slices every history date to `YYYY-MM-DD`
 * before it reaches the client — so they are built as local dates. A value that
 * does carry a time is left to `Date` to parse, where the offset is real.
 */
function parseDisplayDate(value: string) {
  const dateOnly = DATE_ONLY.exec(value);
  if (!dateOnly) return new Date(value);
  const [, year, month, day] = dateOnly;
  return new Date(Number(year), Number(month) - 1, Number(day ?? "1"));
}

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = parseDisplayDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthLabel(value: string) {
  const parsed = parseDisplayDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export function formatRelativeTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "recently";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function extractUrlPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

const ELLIPSIS = "...";

export function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= ELLIPSIS.length)
    return value.slice(0, Math.max(maxLength, 0));
  const sideLength = Math.floor((maxLength - ELLIPSIS.length) / 2);
  if (sideLength <= 0) {
    return `${value.slice(0, maxLength - ELLIPSIS.length)}${ELLIPSIS}`;
  }
  return `${value.slice(0, sideLength)}${ELLIPSIS}${value.slice(-sideLength)}`;
}

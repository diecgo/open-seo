/** Types and helpers shared by the sales radar rules and service. */

export const SERVICES = {
  maps: "SEO local en Google Maps",
  reviews: "Gestión de ficha y reseñas",
  recovery: "Recuperación SEO + Google Ads",
  onPage: "SEO on-page",
  content: "Contenidos SEO",
  tracking: "Seguimiento SEO",
  technical: "Mantenimiento web y SEO técnico",
  ai: "Visibilidad en IA (GEO)",
  analytics: "Analítica y medición",
} as const;

type SalesService = (typeof SERVICES)[keyof typeof SERVICES];

export interface SalesSignal {
  id: string;
  kind: "sale" | "setup";
  service: SalesService;
  title: string;
  evidence: string;
  weight: number;
}

export interface RadarRankKeyword {
  keyword: string;
  position: number | null;
  previousPosition: number | null;
  /** Competitors ranking above the project now that were not before. */
  overtakenBy: string[];
}

export interface RadarLocalKeyword {
  keyword: string;
  /** Average rank over grid points where the business was found. */
  averageRank: number | null;
  top3Percent: number;
  ownReviews: number | null;
  competitorReviewsMedian: number | null;
}

export interface RadarSnapshot {
  rank: { lastCheckedAt: string | null; keywords: RadarRankKeyword[] } | null;
  local: { lastScanAt: string | null; keywords: RadarLocalKeyword[] } | null;
  audit: {
    completedAt: string | null;
    issues: { issueType: string; severity: string; pages: number }[];
  } | null;
  ai: { gapPrompts: string[]; notCitedPrompts: string[] } | null;
  gscConnected: boolean;
  ga4Connected: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const ON_PAGE_ISSUES = new Set([
  "missing-title",
  "duplicate-title",
  "missing-meta-description",
  "duplicate-meta-description",
  "missing-h1",
  "multiple-h1",
  "thin-content",
  "images-missing-alt",
]);
export const ERROR_PAGE_ISSUES = new Set(["server-error", "broken-page"]);
export const label = (i: { issueType: string; pages: number }) =>
  `${i.issueType} (${i.pages} pág.)`;

export function examples(items: string[], max = 3) {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} y ${items.length - max} más` : shown;
}

export function capped(count: number, each: number, cap: number) {
  return Math.min(count * each, cap);
}

export function olderThan(iso: string | null, days: number, now: Date) {
  return !iso || now.getTime() - new Date(iso).getTime() > days * DAY_MS;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values];
  sorted.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

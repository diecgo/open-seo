import { getIssueTypePageCountsForAudit } from "@/server/features/audit/repositories/auditSummaryQueries";
import { LocalSeoRepository } from "@/server/features/local-seo/repositories/LocalSeoRepository";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { getLatestResults } from "@/server/features/rank-tracking/services/rankTrackingResults";
import type {
  RankTrackingDeviceResult,
  RankTrackingRow,
} from "@/types/schemas/rank-tracking";
import { SalesRadarQueries } from "./salesRadarQueries";
import { evaluateSalesRadar } from "./salesRadarRules";
import {
  median,
  type RadarLocalKeyword,
  type RadarRankKeyword,
  type RadarSnapshot,
} from "./salesRadarShared";

/** The device the snapshot reads: mobile when it has been checked. */
function primaryDevice(row: RankTrackingRow): RankTrackingDeviceResult {
  return row.mobile.checkedAt ? row.mobile : row.desktop;
}

function toRankKeyword(row: RankTrackingRow): RadarRankKeyword {
  const device = primaryDevice(row);
  const own = device.position ?? Number.POSITIVE_INFINITY;
  const ownBefore = device.previousPosition ?? Number.POSITIVE_INFINITY;
  const overtakenBy = device.competitors
    .filter(
      (c) =>
        c.position !== null &&
        c.position < own &&
        // A previous check must exist, or the first run would flag everyone.
        (device.previousPosition !== null || c.previousPosition !== null) &&
        (c.previousPosition ?? Number.POSITIVE_INFINITY) > ownBefore,
    )
    .map((c) => c.domain);
  return {
    keyword: row.keyword,
    position: device.position,
    previousPosition: device.previousPosition,
    overtakenBy,
  };
}

async function loadRank(projectId: string): Promise<RadarSnapshot["rank"]> {
  const configs = await RankTrackingRepository.getConfigsForProject(projectId);
  if (!configs.length) return null;
  const results = await Promise.all(
    configs.map((c) => getLatestResults(c.id, projectId, "30d")),
  );
  const lastCheckedAt = configs.reduce<string | null>(
    (latest, c) =>
      c.lastCheckedAt && (!latest || c.lastCheckedAt > latest)
        ? c.lastCheckedAt
        : latest,
    null,
  );
  return {
    lastCheckedAt,
    keywords: results.flatMap((r) => r.rows.map(toRankKeyword)),
  };
}

async function loadLocal(projectId: string): Promise<RadarSnapshot["local"]> {
  const trackers = await LocalSeoRepository.listTrackers(projectId);
  if (!trackers.length) return null;
  const keywords: RadarLocalKeyword[] = [];
  let lastScanAt: string | null = null;
  for (const tracker of trackers) {
    const [active, scans] = await Promise.all([
      LocalSeoRepository.getKeywords(tracker.id),
      SalesRadarQueries.getLatestLocalScans(projectId, tracker.id),
    ]);
    const { points, businesses } = await SalesRadarQueries.getLocalScanDetails(
      scans.map((s) => s.id),
    );
    const isOwn = (b: { cid: string | null; placeId: string | null }) =>
      (!!tracker.cid && b.cid === tracker.cid) ||
      (!!tracker.placeId && b.placeId === tracker.placeId);
    for (const keyword of active) {
      const scan = scans.find((s) => s.keywordId === keyword.id);
      if (!scan) continue;
      if (scan.completedAt && (!lastScanAt || scan.completedAt > lastScanAt)) {
        lastScanAt = scan.completedAt;
      }
      const ranks = points.filter((p) => p.scanId === scan.id);
      const found = ranks.flatMap((p) => (p.rank === null ? [] : [p.rank]));
      const scanBusinesses = businesses.filter((b) => b.scanId === scan.id);
      const own = scanBusinesses.find(isOwn);
      keywords.push({
        keyword: keyword.keyword,
        averageRank: found.length
          ? found.reduce((a, b) => a + b, 0) / found.length
          : null,
        top3Percent: ranks.length
          ? (found.filter((r) => r <= 3).length / ranks.length) * 100
          : 0,
        ownReviews: own?.reviews ?? null,
        competitorReviewsMedian: median(
          scanBusinesses
            .filter((b) => !isOwn(b))
            .flatMap((b) => (b.reviews === null ? [] : [b.reviews])),
        ),
      });
    }
  }
  return { lastScanAt, keywords };
}

async function loadAudit(projectId: string): Promise<RadarSnapshot["audit"]> {
  const audit = await SalesRadarQueries.getLatestCompletedAudit(projectId);
  if (!audit) return null;
  const issues = await getIssueTypePageCountsForAudit(audit.id);
  return { completedAt: audit.completedAt, issues };
}

async function loadAi(projectId: string): Promise<RadarSnapshot["ai"]> {
  const matches = await SalesRadarQueries.getLatestAiMatches(projectId);
  if (!matches) return null;
  const byPrompt = new Map<string, typeof matches>();
  for (const m of matches) {
    byPrompt.set(m.prompt, [...(byPrompt.get(m.prompt) ?? []), m]);
  }
  const gapPrompts: string[] = [];
  const notCitedPrompts: string[] = [];
  for (const [prompt, rows] of byPrompt) {
    const own = rows.filter((r) => r.own);
    const ownMentioned = own.some((r) => r.mentioned);
    const ownCited = own.some((r) => r.cited);
    const rivals = rows.some((r) => !r.own && (r.mentioned || r.cited));
    if (!ownMentioned && !ownCited && rivals) gapPrompts.push(prompt);
    else if (ownMentioned && !ownCited) notCitedPrompts.push(prompt);
  }
  return { gapPrompts, notCitedPrompts };
}

async function buildProject(
  project: { id: string; name: string; domain: string | null },
  now: Date,
) {
  const [rank, local, audit, ai, connections] = await Promise.all([
    loadRank(project.id),
    loadLocal(project.id),
    loadAudit(project.id),
    loadAi(project.id),
    SalesRadarQueries.getConnections(project.id),
  ]);
  const result = evaluateSalesRadar(
    { rank, local, audit, ai, ...connections },
    now,
  );
  return {
    projectId: project.id,
    name: project.name,
    domain: project.domain,
    ...result,
  };
}

/**
 * Every active project of the organization, ranked by how much there is to
 * sell. Reads stored data only: it never calls DataForSEO or Google.
 */
async function getSalesRadar(organizationId: string) {
  const projects = await ProjectService.listProjects(organizationId);
  const now = new Date();
  const rows = await Promise.all(projects.map((p) => buildProject(p, now)));
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "es"));
  return rows;
}

export const SalesRadarService = { getSalesRadar };

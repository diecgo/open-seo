import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  aiMatches,
  aiObservations,
  aiPrompts,
  aiRuns,
  audits,
  ga4Connections,
  gscConnections,
  localRankBusinesses,
  localRankPoints,
  localRankScans,
} from "@/db/schema";
import { LocalPointStatus, LocalScanStatus } from "@/shared/local-seo";

async function getLatestCompletedAudit(projectId: string) {
  const [row] = await db
    .select({ id: audits.id, completedAt: audits.completedAt })
    .from(audits)
    .where(and(eq(audits.projectId, projectId), eq(audits.status, "completed")))
    .orderBy(desc(audits.completedAt))
    .limit(1);
  return row ?? null;
}

/** Latest finished scan per keyword of one local tracker. */
async function getLatestLocalScans(projectId: string, trackerId: string) {
  const scans = await db
    .select({
      id: localRankScans.id,
      keywordId: localRankScans.keywordId,
      completedAt: localRankScans.completedAt,
    })
    .from(localRankScans)
    .where(
      and(
        eq(localRankScans.projectId, projectId),
        eq(localRankScans.trackerId, trackerId),
        inArray(localRankScans.status, [
          LocalScanStatus.Completed,
          LocalScanStatus.Partial,
        ]),
      ),
    )
    .orderBy(desc(localRankScans.createdAt));
  const latest = new Map<string, (typeof scans)[number]>();
  for (const scan of scans) {
    if (!latest.has(scan.keywordId)) latest.set(scan.keywordId, scan);
  }
  return [...latest.values()];
}

async function getLocalScanDetails(scanIds: string[]) {
  if (!scanIds.length) return { points: [], businesses: [] };
  const [points, businesses] = await Promise.all([
    db
      .select({ scanId: localRankPoints.scanId, rank: localRankPoints.rank })
      .from(localRankPoints)
      .where(
        and(
          inArray(localRankPoints.scanId, scanIds),
          eq(localRankPoints.status, LocalPointStatus.Completed),
        ),
      ),
    db
      .select({
        scanId: localRankBusinesses.scanId,
        cid: localRankBusinesses.cid,
        placeId: localRankBusinesses.placeId,
        reviews: localRankBusinesses.reviews,
      })
      .from(localRankBusinesses)
      .where(inArray(localRankBusinesses.scanId, scanIds)),
  ]);
  return { points, businesses };
}

/**
 * Brand matches for the prompts of the project's latest completed AI run.
 * One row per match; the service groups them by prompt.
 */
async function getLatestAiMatches(projectId: string) {
  const [run] = await db
    .select({ id: aiRuns.id })
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.projectId, projectId),
        inArray(aiRuns.status, ["completed", "partial"]),
      ),
    )
    .orderBy(desc(aiRuns.createdAt))
    .limit(1);
  if (!run) return null;
  return db
    .select({
      prompt: aiPrompts.text,
      own: aiMatches.own,
      mentioned: aiMatches.mentioned,
      cited: aiMatches.cited,
    })
    .from(aiObservations)
    .innerJoin(aiPrompts, eq(aiPrompts.id, aiObservations.promptId))
    .innerJoin(aiMatches, eq(aiMatches.observationId, aiObservations.id))
    .where(
      and(
        eq(aiObservations.runId, run.id),
        eq(aiObservations.status, "completed"),
      ),
    );
}

async function getConnections(projectId: string) {
  const [gsc, ga4] = await Promise.all([
    db
      .select({ id: gscConnections.id })
      .from(gscConnections)
      .where(eq(gscConnections.projectId, projectId))
      .limit(1),
    db
      .select({ id: ga4Connections.id })
      .from(ga4Connections)
      .where(eq(ga4Connections.projectId, projectId))
      .limit(1),
  ]);
  return { gscConnected: gsc.length > 0, ga4Connected: ga4.length > 0 };
}

export const SalesRadarQueries = {
  getLatestCompletedAudit,
  getLatestLocalScans,
  getLocalScanDetails,
  getLatestAiMatches,
  getConnections,
};

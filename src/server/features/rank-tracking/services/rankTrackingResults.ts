import { z } from "zod";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { toRankTrackingTimestamp } from "@/server/features/rank-tracking/rankTrackingTimestamps";
import { AppError } from "@/server/lib/errors";
import type { ComparePeriod } from "@/types/schemas/rank-tracking-search";
import type {
  RankTrackingCompetitorResult,
  RankTrackingDeviceResult,
  RankTrackingRow,
} from "@/types/schemas/rank-tracking";

type SnapshotRow = Awaited<
  ReturnType<typeof RankTrackingRepository.getLatestSnapshotsForKeywords>
>[0];

const PERIOD_DAYS: Record<ComparePeriod, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function getLatestResults(
  configId: string,
  projectId: string,
  comparePeriod: ComparePeriod = "7d",
): Promise<{
  rows: RankTrackingRow[];
  run: {
    id: string;
    lastCheckedAt: string | null;
    completedAt: string | null;
    status: "pending" | "running" | "completed" | "failed";
    errorMessage: string | null;
  } | null;
}> {
  const days = PERIOD_DAYS[comparePeriod];
  const targetDate = toRankTrackingTimestamp(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  );

  // All four reads key off the inputs alone, so run them in one parallel round
  // trip instead of four sequential ones — this endpoint is hot and the DB may
  // be a continent away. The project-scoped config lookup doubles as the
  // authorization gate for the configId-keyed reads racing alongside it: when
  // config is null, throw without returning anything from the other reads.
  const [
    config,
    activeKeywords,
    currentSnapshots,
    comparisonSnapshots,
    latestRun,
  ] = await Promise.all([
    RankTrackingRepository.getConfigById({ configId, projectId }),
    RankTrackingRepository.getKeywordsForConfig(configId),
    // Latest snapshot per keyword per device (across all completed runs)
    RankTrackingRepository.getLatestSnapshotsForKeywords(configId),
    // Comparison snapshots from before the target date
    RankTrackingRepository.getSnapshotsBeforeDate(configId, targetDate),
    RankTrackingRepository.getLatestRunForConfig(configId),
  ]);
  if (!config) {
    throw new AppError("INTERNAL_ERROR", "Rank tracking config not found");
  }

  const previousPositions = new Map<string, number | null>();
  // Each competitor's position in the same comparison snapshot, by domain.
  const previousCompetitors = new Map<string, Map<string, number | null>>();
  const setPrevious = (snap: SnapshotRow) => {
    const key = `${snap.trackingKeywordId}:${snap.device}`;
    previousPositions.set(key, snap.position);
    previousCompetitors.set(
      key,
      new Map(
        parseCompetitorPositions(snap.competitorPositions).map((c) => [
          c.domain,
          c.position,
        ]),
      ),
    );
  };
  for (const snap of comparisonSnapshots) {
    setPrevious(snap);
  }

  // Fallback: for keyword+device combos with no comparison snapshot before
  // the target date, use the earliest available snapshot as a baseline.
  const missingKeywordIds: string[] = [];
  for (const snap of currentSnapshots) {
    const key = `${snap.trackingKeywordId}:${snap.device}`;
    if (!previousPositions.has(key)) {
      missingKeywordIds.push(snap.trackingKeywordId);
    }
  }

  if (missingKeywordIds.length > 0) {
    const uniqueMissingIds = [...new Set(missingKeywordIds)];
    const earliestSnapshots =
      await RankTrackingRepository.getEarliestSnapshotsForKeywords(
        configId,
        uniqueMissingIds,
      );
    for (const snap of earliestSnapshots) {
      const key = `${snap.trackingKeywordId}:${snap.device}`;
      if (!previousPositions.has(key)) {
        setPrevious(snap);
      }
    }
  }

  // Build result rows
  const rows = new Map<string, RankTrackingRow>(
    activeKeywords.map((keyword) => [
      keyword.id,
      {
        trackingKeywordId: keyword.id,
        keyword: keyword.keyword,
        matchCase: keyword.matchCase,
        pinned: keyword.pinnedAt !== null,
        searchVolume: keyword.searchVolume,
        keywordDifficulty: keyword.keywordDifficulty,
        cpc: keyword.cpc,
        desktop: createEmptyDeviceResult(
          previousPositions.get(`${keyword.id}:desktop`) ?? null,
        ),
        mobile: createEmptyDeviceResult(
          previousPositions.get(`${keyword.id}:mobile`) ?? null,
        ),
      },
    ]),
  );

  // Freshness comes from the newest snapshot regardless of which run wrote
  // it, so a newer failed run doesn't erase the date of the results shown.
  let latestStartedAt: string | null = null;

  for (const snapshot of currentSnapshots) {
    const row = rows.get(snapshot.trackingKeywordId);
    if (!row) continue;
    const key = `${snapshot.trackingKeywordId}:${snapshot.device}`;
    row[snapshot.device] = toDeviceResult(
      snapshot,
      previousPositions.get(key) ?? null,
      previousCompetitors.get(key),
    );

    if (!latestStartedAt || snapshot.checkedAt > latestStartedAt) {
      latestStartedAt = snapshot.checkedAt;
    }
  }

  return {
    rows: [...rows.values()],
    run: latestRun
      ? {
          id: latestRun.id,
          // Snapshot-derived: a run that saved zero snapshots leaves this
          // null even though it finished, so read completedAt for the run.
          lastCheckedAt: latestStartedAt,
          completedAt: latestRun.completedAt,
          status: latestRun.status,
          // An active run's error is provisional: its retries may still check
          // those keywords, and finalize rewrites it when the run ends.
          errorMessage:
            latestRun.status === "completed" || latestRun.status === "failed"
              ? latestRun.errorMessage
              : null,
        }
      : null,
  };
}

function parseSerpFeatures(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

// Written by the rank check itself, but validated here since it is stored as
// text: a row that does not parse shows no competitors rather than failing.
const competitorPositionsSchema = z.array(
  z.object({
    domain: z.string(),
    position: z.number().nullable(),
    url: z.string().nullable(),
  }),
);

function parseCompetitorPositions(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = competitorPositionsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function createEmptyDeviceResult(
  previousPosition: number | null,
): RankTrackingDeviceResult {
  return {
    position: null,
    previousPosition,
    rankingUrl: null,
    serpFeatures: [],
    competitors: [],
    checkedAt: null,
  };
}

function toDeviceResult(
  snapshot: SnapshotRow,
  previousPosition: number | null,
  previousCompetitors: Map<string, number | null> | undefined,
): RankTrackingDeviceResult {
  const competitors: RankTrackingCompetitorResult[] = parseCompetitorPositions(
    snapshot.competitorPositions,
  ).map((c) => ({
    domain: c.domain,
    position: c.position,
    previousPosition: previousCompetitors?.get(c.domain) ?? null,
    url: c.url,
  }));
  return {
    position: snapshot.position,
    previousPosition,
    rankingUrl: snapshot.url,
    serpFeatures: parseSerpFeatures(snapshot.serpFeatures),
    competitors,
    checkedAt: snapshot.checkedAt,
  };
}

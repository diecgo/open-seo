import { describe, expect, it } from "vitest";
import { evaluateSalesRadar } from "./salesRadarRules";
import type { RadarSnapshot } from "./salesRadarShared";

const now = new Date("2026-11-20T12:00:00Z");
const recent = "2026-11-18T12:00:00Z";

const empty: RadarSnapshot = {
  rank: null,
  local: null,
  audit: null,
  ai: null,
  gscConnected: true,
  ga4Connected: true,
};

describe("evaluateSalesRadar", () => {
  it("lists missing data as setup items without scoring them", () => {
    const result = evaluateSalesRadar({ ...empty, gscConnected: false }, now);
    expect(result.score).toBe(0);
    expect(result.services).toEqual([]);
    const ids = result.signals.map((s) => s.id);
    ids.sort();
    expect(ids).toEqual([
      "ai-unmeasured",
      "gsc-missing",
      "maps-unscanned",
      "organic-untracked",
      "technical-missing",
    ]);
  });

  it("scores lost, dropped and near-top-ten keywords and caps the total at 100", () => {
    const keywords = [
      { keyword: "a", position: null, previousPosition: 4 },
      { keyword: "b", position: null, previousPosition: 6 },
      { keyword: "c", position: 12, previousPosition: 8 },
      { keyword: "d", position: 15, previousPosition: 15 },
    ].map((k) => ({ ...k, overtakenBy: [] }));
    const result = evaluateSalesRadar(
      {
        ...empty,
        rank: { lastCheckedAt: recent, keywords },
        local: {
          lastScanAt: recent,
          keywords: [
            {
              keyword: "x",
              averageRank: 14,
              top3Percent: 10,
              ownReviews: 4,
              competitorReviewsMedian: 40,
            },
          ],
        },
        audit: {
          completedAt: recent,
          issues: [
            { issueType: "server-error", severity: "critical", pages: 3 },
            { issueType: "missing-title", severity: "critical", pages: 2 },
            { issueType: "crawl-page-limit", severity: "warning", pages: 1 },
          ],
        },
      },
      now,
    );
    const weight = (id: string) =>
      result.signals.find((s) => s.id === id)?.weight;
    expect(weight("organic-lost")).toBe(30);
    expect(weight("organic-drops")).toBe(8);
    expect(weight("organic-near-top-ten")).toBe(12);
    expect(weight("maps-reviews")).toBe(20);
    expect(weight("technical-serious")).toBe(25);
    expect(
      result.signals.find((s) => s.id === "technical-serious")?.evidence,
    ).toContain("Error del servidor (5xx) (3 pág.)");
    expect(weight("technical-issues")).toBeUndefined();
    expect(result.score).toBe(100);
    expect(result.signals[0].weight).toBe(30);
  });
});

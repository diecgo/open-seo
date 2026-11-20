/**
 * Sales radar rules: turn what OpenSEO already knows about a project into
 * selling points (services the client would benefit from) and setup gaps
 * (data we do not collect yet). Pure: no I/O, so the scoring is easy to
 * reason about. Texts are in Spanish on purpose: they are read by the
 * agency's sales team, not shown to end users of the app.
 */

import {
  capped,
  ERROR_PAGE_ISSUES,
  examples,
  label,
  olderThan,
  ON_PAGE_ISSUES,
  SERVICES,
  type RadarSnapshot,
  type SalesSignal,
} from "./salesRadarShared";

function localSignals(local: RadarSnapshot["local"], now: Date): SalesSignal[] {
  if (!local || !local.keywords.length) {
    return [
      {
        id: "maps-unscanned",
        kind: "setup",
        service: SERVICES.maps,
        title: "Sin seguimiento en Google Maps",
        evidence: "Crea un rastreador local para medir su posición en el mapa.",
        weight: 0,
      },
    ];
  }
  const signals: SalesSignal[] = [];
  const found = local.keywords.filter((k) => k.averageRank !== null);
  if (!found.length) {
    signals.push({
      id: "maps-missing",
      kind: "sale",
      service: SERVICES.maps,
      title: "No aparece en Google Maps",
      evidence: `La ficha no sale en ningún punto de la cuadrícula para ${examples(local.keywords.map((k) => k.keyword))}.`,
      weight: 25,
    });
  }
  const weak = found.filter(
    (k) => (k.averageRank ?? 0) > 10 || k.top3Percent < 30,
  );
  if (weak.length) {
    signals.push({
      id: "maps-weak",
      kind: "sale",
      service: SERVICES.maps,
      title: "Posición débil en Google Maps",
      evidence: weak
        .slice(0, 3)
        .map(
          (k) =>
            `${k.keyword}: media ${k.averageRank?.toFixed(1)}, top 3 en ${Math.round(k.top3Percent)}% de puntos`,
        )
        .join("; "),
      weight: capped(weak.length, 10, 30),
    });
  }
  const reviewGap = local.keywords.find(
    (k) =>
      k.ownReviews !== null &&
      k.competitorReviewsMedian !== null &&
      k.competitorReviewsMedian >= 10 &&
      k.ownReviews < k.competitorReviewsMedian / 2,
  );
  if (reviewGap) {
    signals.push({
      id: "maps-reviews",
      kind: "sale",
      service: SERVICES.reviews,
      title: "Pocas reseñas frente a la competencia",
      evidence: `${reviewGap.ownReviews} reseñas frente a una mediana de ${Math.round(reviewGap.competitorReviewsMedian ?? 0)} en la competencia del mapa.`,
      weight: 20,
    });
  }
  if (olderThan(local.lastScanAt, 30, now)) {
    signals.push({
      id: "maps-stale",
      kind: "setup",
      service: SERVICES.maps,
      title: "Escaneo de Maps antiguo",
      evidence: "El último escaneo local tiene más de 30 días.",
      weight: 0,
    });
  }
  return signals;
}

function rankSignals(rank: RadarSnapshot["rank"], now: Date): SalesSignal[] {
  if (!rank || !rank.keywords.length) {
    return [
      {
        id: "organic-untracked",
        kind: "setup",
        service: SERVICES.tracking,
        title: "Sin seguimiento de posiciones",
        evidence: "Crea un rastreador de palabras clave para medir Google.",
        weight: 0,
      },
    ];
  }
  const signals: SalesSignal[] = [];
  const kw = rank.keywords;
  const checked = kw.filter(
    (k) => k.position !== null || k.previousPosition !== null,
  );
  const ranking = kw.filter((k) => k.position !== null);
  if (rank.lastCheckedAt && !ranking.length) {
    signals.push({
      id: "organic-missing",
      kind: "sale",
      service: SERVICES.onPage,
      title: "No aparece en Google para sus palabras clave",
      evidence: `Ninguna de las ${kw.length} palabras seguidas está entre los resultados medidos.`,
      weight: 15,
    });
  }
  const lost = checked.filter(
    (k) => k.position === null && k.previousPosition !== null,
  );
  if (lost.length) {
    signals.push({
      id: "organic-lost",
      kind: "sale",
      service: SERVICES.recovery,
      title: "Palabras clave perdidas",
      evidence: `Ha dejado de aparecer para ${examples(lost.map((k) => k.keyword))}.`,
      weight: capped(lost.length, 15, 30),
    });
  }
  const drops = ranking.filter(
    (k) => k.previousPosition !== null && k.position! - k.previousPosition >= 3,
  );
  if (drops.length) {
    signals.push({
      id: "organic-drops",
      kind: "sale",
      service: SERVICES.recovery,
      title: "Caídas de posición",
      evidence: drops
        .slice(0, 3)
        .map((k) => `${k.keyword}: ${k.previousPosition} → ${k.position}`)
        .join("; "),
      weight: capped(drops.length, 8, 16),
    });
  }
  const nearTop = ranking.filter((k) => k.position! > 10 && k.position! <= 20);
  if (nearTop.length) {
    signals.push({
      id: "organic-near-top-ten",
      kind: "sale",
      service: SERVICES.content,
      title: "A un paso de la primera página",
      evidence: nearTop
        .slice(0, 3)
        .map((k) => `${k.keyword} (${k.position})`)
        .join(", "),
      weight: capped(nearTop.length, 6, 24),
    });
  }
  const overtaken = kw.filter((k) => k.overtakenBy.length);
  if (overtaken.length) {
    signals.push({
      id: "organic-overtaken",
      kind: "sale",
      service: SERVICES.content,
      title: "La competencia le ha adelantado",
      evidence: overtaken
        .slice(0, 3)
        .map((k) => `${k.keyword}: ${k.overtakenBy.join(", ")}`)
        .join("; "),
      weight: capped(overtaken.length, 5, 15),
    });
  }
  if (olderThan(rank.lastCheckedAt, 30, now)) {
    signals.push({
      id: "organic-stale",
      kind: "setup",
      service: SERVICES.tracking,
      title: "Posiciones sin actualizar",
      evidence: "La última comprobación de posiciones tiene más de 30 días.",
      weight: 0,
    });
  }
  return signals;
}

function auditSignals(
  audit: RadarSnapshot["audit"],
  tracksKeywords: boolean,
  now: Date,
): SalesSignal[] {
  if (!audit) {
    return [
      {
        id: "technical-missing",
        kind: "setup",
        service: SERVICES.technical,
        title: "Sin auditoría técnica",
        evidence: "Lanza una auditoría del sitio para detectar errores.",
        weight: 0,
      },
    ];
  }
  const signals: SalesSignal[] = [];
  const critical = audit.issues.filter((i) => i.severity === "critical");
  if (critical.length) {
    const base = capped(critical.length, 10, 25);
    signals.push({
      id: "technical-serious",
      kind: "sale",
      service: SERVICES.technical,
      title: "Errores técnicos graves",
      evidence: examples(critical.map(label)),
      weight: Math.min(base + (tracksKeywords ? 5 : 0), 30),
    });
  }
  const errorPages = audit.issues
    .filter((i) => ERROR_PAGE_ISSUES.has(i.issueType))
    .reduce((sum, i) => sum + i.pages, 0);
  if (errorPages) {
    signals.push({
      id: "technical-errors",
      kind: "sale",
      service: SERVICES.technical,
      title: "Páginas con error",
      evidence: `${errorPages} páginas devuelven error o no cargan.`,
      weight: capped(errorPages, 2, 10),
    });
  }
  const warnings = audit.issues.filter(
    (i) => i.severity === "warning" && !ON_PAGE_ISSUES.has(i.issueType),
  );
  if (warnings.length) {
    signals.push({
      id: "technical-issues",
      kind: "sale",
      service: SERVICES.technical,
      title: "Avisos técnicos",
      evidence: examples(warnings.map(label)),
      weight: capped(warnings.length, 2, 15),
    });
  }
  const onPage = audit.issues.filter((i) => ON_PAGE_ISSUES.has(i.issueType));
  if (onPage.length) {
    signals.push({
      id: "technical-on-page",
      kind: "sale",
      service: SERVICES.onPage,
      title: "Mejoras on-page pendientes",
      evidence: examples(onPage.map(label)),
      weight: capped(onPage.length, 3, 12),
    });
  }
  if (olderThan(audit.completedAt, 90, now)) {
    signals.push({
      id: "technical-stale",
      kind: "setup",
      service: SERVICES.technical,
      title: "Auditoría antigua",
      evidence: "La última auditoría completa tiene más de 90 días.",
      weight: 0,
    });
  }
  return signals;
}

function aiSignals(ai: RadarSnapshot["ai"]): SalesSignal[] {
  if (!ai) {
    return [
      {
        id: "ai-unmeasured",
        kind: "setup",
        service: SERVICES.ai,
        title: "Visibilidad en IA sin medir",
        evidence: "Configura prompts de visibilidad en IA para este proyecto.",
        weight: 0,
      },
    ];
  }
  const signals: SalesSignal[] = [];
  if (ai.gapPrompts.length) {
    signals.push({
      id: "ai-competitors-cited",
      kind: "sale",
      service: SERVICES.ai,
      title: "La IA recomienda a la competencia",
      evidence: `Aparecen competidores y la marca no en: ${examples(ai.gapPrompts, 2)}.`,
      weight: capped(ai.gapPrompts.length, 8, 24),
    });
  }
  if (ai.notCitedPrompts.length) {
    signals.push({
      id: "ai-not-cited",
      kind: "sale",
      service: SERVICES.ai,
      title: "Mencionada pero sin enlace",
      evidence: `La IA nombra la marca sin citar su web en: ${examples(ai.notCitedPrompts, 2)}.`,
      weight: capped(ai.notCitedPrompts.length, 4, 12),
    });
  }
  return signals;
}

function connectionSignals(snapshot: RadarSnapshot): SalesSignal[] {
  const signals: SalesSignal[] = [];
  if (!snapshot.gscConnected) {
    signals.push({
      id: "gsc-missing",
      kind: "setup",
      service: SERVICES.analytics,
      title: "Search Console sin conectar",
      evidence: "Conecta Search Console para ver búsquedas y clics reales.",
      weight: 0,
    });
  }
  if (!snapshot.ga4Connected) {
    signals.push({
      id: "analytics-missing",
      kind: "setup",
      service: SERVICES.analytics,
      title: "Google Analytics sin conectar",
      evidence: "Conecta GA4 para medir tráfico y conversiones.",
      weight: 0,
    });
  }
  return signals;
}

/** Signals sorted by weight, plus a 0–100 score from the selling points. */
export function evaluateSalesRadar(snapshot: RadarSnapshot, now: Date) {
  const signals = [
    ...localSignals(snapshot.local, now),
    ...rankSignals(snapshot.rank, now),
    ...auditSignals(snapshot.audit, !!snapshot.rank?.keywords.length, now),
    ...aiSignals(snapshot.ai),
    ...connectionSignals(snapshot),
  ];
  signals.sort((a, b) => b.weight - a.weight);
  const sales = signals.filter((s) => s.kind === "sale");
  return {
    score: Math.min(
      100,
      sales.reduce((sum, s) => sum + s.weight, 0),
    ),
    services: [...new Set(sales.map((s) => s.service))],
    signals,
  };
}

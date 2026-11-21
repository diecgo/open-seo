import type { CsvValue } from "@/client/lib/csv";
import type { CategoryTab, LighthouseIssue } from "./types";

const ISSUE_HEADERS = [
  "Category",
  "Severity",
  "Score",
  "Title",
  "Display Value",
  "Description",
  "Impact (ms)",
  "Impact (bytes)",
  "Affected Items",
];

function issuesToRows(issues: LighthouseIssue[]): CsvValue[][] {
  return issues.map((issue) => [
    issue.category,
    issue.severity,
    issue.score ?? "",
    issue.title,
    issue.displayValue ?? "",
    issue.description ?? "",
    issue.impactMs ?? "",
    issue.impactBytes ?? "",
    issue.items.length,
  ]);
}

export function issuesToTable(issues: LighthouseIssue[]) {
  return { headers: ISSUE_HEADERS, rows: issuesToRows(issues) };
}

const CATEGORY_LABELS: Partial<Record<CategoryTab, string>> = {
  all: "Todos",
  performance: "Rendimiento",
  accessibility: "Accesibilidad",
  "best-practices": "Buenas prácticas",
  seo: "SEO",
};

export function categoryLabel(category: CategoryTab) {
  return (
    CATEGORY_LABELS[category] ??
    `${category.charAt(0).toUpperCase()}${category.slice(1)}`
  );
}

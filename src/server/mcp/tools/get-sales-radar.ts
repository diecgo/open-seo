import { SalesRadarService } from "@/server/features/sales-radar/SalesRadarService";
import { mcpResponse } from "@/server/mcp/formatters";
import { type ToolContext } from "@/server/mcp/context";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { buildDashboardUrl } from "@/server/mcp/urls";
import { z } from "zod";

const signalSchema = z.looseObject({
  id: z.string(),
  kind: z.enum(["sale", "setup"]),
  service: z.string(),
  title: z.string(),
  evidence: z.string(),
  weight: z.number(),
});

export const getSalesRadarTool = {
  name: "get_sales_radar",
  config: {
    title: "Get sales radar",
    description:
      "Rank every project of the organization by sales opportunity: a 0-100 score, the services worth offering (in Spanish) and the evidence behind each, from stored rank tracking, local Maps grids, site audits and AI visibility. Setup items list data not collected yet. Reads stored data only and uses no credits.",
    inputSchema: {} as Record<string, never>,
    outputSchema: z.looseObject({
      projects: z.array(
        z.looseObject({
          projectId: z.string(),
          name: z.string(),
          domain: z.string().nullable(),
          score: z.number(),
          services: z.array(z.string()),
          signals: z.array(signalSchema),
        }),
      ),
      ...optionalMetaOutputSchema,
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: async (_args: Record<string, never>, context: ToolContext) => {
    const { baseUrl, organizationId } = context.auth;
    const projects = await SalesRadarService.getSalesRadar(organizationId);
    const lines = projects.map((p) => {
      const sales = p.signals
        .filter((s) => s.kind === "sale")
        .map(
          (s) => `  - [${s.weight}] ${s.service}: ${s.title}. ${s.evidence}`,
        );
      const setup = p.signals
        .filter((s) => s.kind === "setup")
        .map((s) => s.title);
      return [
        `${p.name}${p.domain ? ` (${p.domain})` : ""}  score:${p.score}  id:${p.projectId}`,
        ...sales,
        ...(setup.length ? [`  setup: ${setup.join("; ")}`] : []),
      ].join("\n");
    });
    return mcpResponse({
      text: projects.length
        ? `Sales radar (${projects.length} projects):\n${lines.join("\n")}`
        : "No projects yet.",
      meta: { url: buildDashboardUrl(baseUrl, "/radar") },
      structuredContent: { projects },
    });
  },
};

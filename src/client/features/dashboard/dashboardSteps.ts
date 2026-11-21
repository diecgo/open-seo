import {
  Bot,
  ClipboardCheck,
  FolderPlus,
  Globe,
  Lightbulb,
  Sparkles,
  Users,
} from "lucide-react";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";

export const setupSteps: {
  id: DashboardSetupStep;
  label: string;
  detail: string;
  icon: typeof Globe;
  skipLabel: string;
}[] = [
  {
    id: "competitor",
    label: "Explora a un competidor",
    detail: "Encuentra temas y enlaces de los que aprender.",
    icon: Globe,
    skipLabel: "Omitir por ahora",
  },
  {
    id: "keywords",
    label: "Consigue ideas de palabras clave",
    detail: "Empieza con una palabra clave y descubre qué busca la gente.",
    icon: Lightbulb,
    skipLabel: "Omitir por ahora",
  },
  {
    id: "audit",
    label: "Audita tu sitio",
    detail:
      "Rastrea en busca de enlaces rotos, etiquetas ausentes y problemas de indexación.",
    icon: ClipboardCheck,
    skipLabel: "Omitir por ahora",
  },
  {
    id: "mcp",
    label: "Conecta tu agente de IA",
    detail: "Usa OpenSEO dentro de Claude o de tu agente favorito.",
    icon: Bot,
    skipLabel: "Omitir por ahora",
  },
  {
    id: "skills",
    label: "Prueba las skills de OpenSEO",
    detail: "Dale a tu agente flujos de SEO repetibles.",
    icon: Sparkles,
    skipLabel: "Descartar",
  },
  {
    id: "team",
    label: "Invita a un compañero",
    detail: "Comparte el trabajo o sigue por tu cuenta de momento.",
    icon: Users,
    skipLabel: "Omitir",
  },
  {
    id: "project",
    label: "¿Trabajas con varios sitios web?",
    detail:
      "Crea otro proyecto o deja que tu agente de IA configure una lista de sitios.",
    icon: FolderPlus,
    skipLabel: "Solo necesito un proyecto",
  },
];

export function isAgentConnected(activation: DashboardActivation) {
  return (
    activation.mcp.authorizedAt !== null ||
    activation.mcp.firstToolCallAt !== null
  );
}

export function getVisibleSteps(
  activation: DashboardActivation,
  includeTeam: boolean,
) {
  return setupSteps.filter((step) => {
    if (step.id === "team") return includeTeam;
    if (step.id === "skills") return isAgentConnected(activation);
    return true;
  });
}

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    competitor: activation.competitorResearchedAt !== null,
    keywords: activation.keywordsResearchedAt !== null,
    audit: activation.hasAudit,
    mcp: isAgentConnected(activation),
    skills: activation.hasSkillReport,
    team: activation.hasTeammate,
    project: activation.hasMultipleProjects,
  };
  if (completed[step]) return "done";
  if (!activation.dismissedSteps.includes(step)) return "todo";
  return completeWhenSkipped.has(step) ? "done" : "skipped";
}

// Skipping these marks them complete, so they never wait in "saved for later".
const completeWhenSkipped = new Set<DashboardSetupStep>([
  "skills",
  "team",
  "project",
]);

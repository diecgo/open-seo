import { createFileRoute } from "@tanstack/react-router";
import { Link2, ListPlus, MessagesSquare } from "lucide-react";
import { z } from "zod";
import { PromptResearchPage } from "@/client/features/ai-visibility/PromptResearchPage";
import { PromptTrackingWithoutUpgradeButton } from "@/client/features/ai-visibility/shared";
import { PaidPlanGate } from "@/client/features/billing/PaidPlanGate";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute(
  "/_app/p/$projectId/ai-visibility/research",
)({
  head: () => pageHead("Investigación de prompts"),
  validateSearch: z.object({ q: z.string().trim().max(100).optional() }),
  component: AiResearchRoute,
});

const PROMPT_RESEARCH_FEATURES = [
  {
    icon: MessagesSquare,
    title: "Preguntas sobre tu mercado",
    body: "Mira las preguntas que la gente hace sobre una palabra clave, de la más habitual a la menos, con la respuesta de ChatGPT a cada una.",
  },
  {
    icon: Link2,
    title: "Quién sale citado",
    body: "Mira qué sitios citó ChatGPT al responder y si el tuyo es uno de ellos.",
  },
  {
    icon: ListPlus,
    title: "Sigue las que importan",
    body: "Elige las preguntas que merece la pena vigilar y añádelas a Seguimiento de prompts en un paso.",
  },
];

function AiResearchRoute() {
  const { projectId } = Route.useParams();
  const { q } = Route.useSearch();
  return (
    <PaidPlanGate
      feature="Investigación de prompts"
      description="Encuentra las preguntas que la gente hace sobre tu mercado, mira cómo las responde ChatGPT y comprueba qué sitios citan las respuestas."
      features={PROMPT_RESEARCH_FEATURES}
      alternative={<PromptTrackingWithoutUpgradeButton projectId={projectId} />}
    >
      <PromptResearchPage key={projectId} projectId={projectId} keyword={q} />
    </PaidPlanGate>
  );
}

import {
  AGENCY_PLAN_OFFER,
  BASE_PLAN_OFFER,
  PRO_PLAN_OFFER,
  type PlanOffer,
} from "@/client/features/billing/plan-offers";
import {
  AUTUMN_AGENCY_ANNUAL_PLAN_ID,
  AUTUMN_PAID_ANNUAL_PLAN_ID,
  AUTUMN_PRO_ANNUAL_PLAN_ID,
  type CheckoutPlanId,
} from "@/shared/billing";

// The tiers on openseo.so/pricing, with the same copy. Its "Get started"
// links highlight one with ?plan=. Each tier's yearly plan costs ten months
// and grants the same monthly credits.
export const TIERS = {
  base: {
    offer: BASE_PLAN_OFFER,
    annual: { planId: AUTUMN_PAID_ANNUAL_PLAN_ID, priceUsd: 100 },
    description: "Para tu propia web.",
    features: [
      "Investigación de palabras clave, backlinks, seguimiento de posiciones y auditorías del sitio",
      "Visibilidad en IA, investigación y seguimiento de prompts",
      "Funciona dentro de Claude, Cursor y ChatGPT",
      "Datos de Google Search Console gratis",
    ],
  },
  pro: {
    offer: PRO_PLAN_OFFER,
    annual: { planId: AUTUMN_PRO_ANNUAL_PLAN_ID, priceUsd: 300 },
    description: "Para freelancers y equipos en crecimiento.",
    features: [
      "Todo lo del plan Base",
      "Un 20 % más de uso del que pagas",
      "Soporte prioritario por email",
    ],
  },
  agency: {
    offer: AGENCY_PLAN_OFFER,
    annual: { planId: AUTUMN_AGENCY_ANNUAL_PLAN_ID, priceUsd: 1000 },
    description: "Para agencias con muchos clientes.",
    features: [
      "Todo lo del plan Pro",
      "Un 20 % más de uso del que pagas",
      "Canal dedicado de Slack Connect",
      "Adopción de IA: ayuda práctica para configurar agentes y flujos de trabajo para tu equipo",
    ],
  },
} satisfies Record<
  string,
  {
    offer: PlanOffer;
    annual: { planId: CheckoutPlanId; priceUsd: number };
    description: string;
    features: string[];
  }
>;
export type Tier = keyof typeof TIERS;

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && Object.hasOwn(TIERS, value);
}

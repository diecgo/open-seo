import type { KeywordIntent } from "@/types/keywords";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

const VARIANTS: Record<
  KeywordIntent,
  "info" | "warning" | "success" | "soft" | "secondary"
> = {
  informational: "info",
  commercial: "warning",
  transactional: "success",
  navigational: "soft",
  unknown: "secondary",
};

const SHORT_LABELS: Record<KeywordIntent, string> = {
  informational: "Info",
  commercial: "Com.",
  transactional: "Trans.",
  navigational: "Nav.",
  unknown: "?",
};

/** Full intent labels, shared with the keyword filters so both stay in sync. */
export const INTENT_LABELS: Record<KeywordIntent, string> = {
  informational: "Informativa",
  commercial: "Comercial",
  transactional: "Transaccional",
  navigational: "Navegacional",
  unknown: "Desconocida",
};

const DESCRIPTIONS: Record<
  KeywordIntent,
  { label: string; description: string }
> = {
  informational: {
    label: INTENT_LABELS.informational,
    description:
      "Quien busca quiere información o respuestas. Úsala para contenido educativo, guías y explicaciones sin apenas comparativas.",
  },
  commercial: {
    label: INTENT_LABELS.commercial,
    description:
      "Quien busca está comparando opciones antes de comprar. Trátala como intención de compra para comparativas, alternativas y páginas de producto.",
  },
  transactional: {
    label: INTENT_LABELS.transactional,
    description:
      "Quien busca está listo para completar una acción, a menudo una compra. Prioriza ofertas claras, precios, pruebas o rutas de conversión.",
  },
  navigational: {
    label: INTENT_LABELS.navigational,
    description:
      "Quien busca quiere llegar a una web, marca o página concreta. Estas búsquedas suelen premiar al destino esperado.",
  },
  unknown: {
    label: INTENT_LABELS.unknown,
    description:
      "No hay datos de intención para esta palabra clave, así que no bases tu estrategia de contenidos solo en esta etiqueta.",
  },
};

export function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const details = DESCRIPTIONS[intent];

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <Badge
            variant={VARIANTS[intent]}
            tabIndex={0}
            className="h-6 min-w-11 cursor-help font-semibold"
          />
        }
        aria-label={`Intención de búsqueda: ${details.label}`}
      >
        {SHORT_LABELS[intent]}
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-1">
        <span className="font-semibold">{details.label}</span>
        <span>{details.description}</span>
      </TooltipContent>
    </Tooltip>
  );
}

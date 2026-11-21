import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Button } from "@/client/components/ui/button";

/**
 * Shown on the chat route until the user opts into Sam. Sam is the OpenSEO
 * MCP plus skills wrapped in an in-app chat; the agents people already use
 * run that same toolset with a more mature harness, so the primary action
 * points there and Sam is the explicit fallback.
 */
export function SamBetaGate({ onContinue }: { onContinue: () => void }) {
  return (
    <GateCard
      icon={Sparkles}
      title="Sam está en beta"
      description={
        <>
          <p>
            Sam es el MCP y las skills de OpenSEO dentro de una ventana de chat.
            El agente que ya usas, como Claude Code, ChatGPT, Grok Bot o Hermes,
            ejecuta esas mismas herramientas en un entorno mucho más capaz. Te
            recomendamos usar OpenSEO ahí.
          </p>
          <p>
            Puedes usar Sam igualmente, pero está en una fase temprana y tiene
            limitaciones.
          </p>
        </>
      }
      actions={
        <>
          <Button size="lg" nativeButton={false} render={<Link to="/ai" />}>
            Configura tu agente
          </Button>
          <Button size="lg" variant="ghost" onClick={onContinue}>
            Usar Sam igualmente
          </Button>
        </>
      }
    />
  );
}

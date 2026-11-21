import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { useSamAccess } from "@/client/features/sam/useSamAccess";

/**
 * AI visibility setup researches the brand and suggests prompts through
 * OpenRouter, so a self-hosted install without a key would only fail after
 * the user starts research. Ask for the key first (hosted always has one).
 */
export function OpenRouterKeyGate({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const access = useSamAccess(projectId);
  if (access.status === "ready") return children;
  if (access.status === "checking") return <SkeletonPageContent />;
  if (access.status === "error")
    return (
      <QueryError
        error={access.error}
        fallback="No se pudo comprobar la clave de API de OpenRouter."
        onRetry={access.onRetry}
        isRetrying={access.isRetrying}
      />
    );
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
      <GateCard
        className="max-w-2xl"
        icon={KeyRound}
        tone="warning"
        title="Añade una clave de API de OpenRouter"
        description={
          <>
            <p>
              Visibilidad en IA usa OpenRouter para investigar tu marca y
              sugerir los prompts que merece la pena seguir, para que no tengas
              que escribirlos tú. Los resultados del seguimiento, lo que
              responden de verdad ChatGPT y otros motores de IA, vienen de tu
              cuenta de DataForSEO.
            </p>
            <p>
              Crea una clave en OpenRouter, configúrala como{" "}
              <code>OPENROUTER_API_KEY</code>, reinicia OpenSEO y confírmalo
              aquí. La{" "}
              <Link
                className="underline underline-offset-2 hover:text-foreground"
                to="/help/openrouter-api-key"
              >
                guía de configuración de la clave de API de OpenRouter
              </Link>{" "}
              explica los pasos para cada despliegue.
            </p>
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              pending={access.isRefetching}
              onClick={access.onRetry}
            >
              Confirmar clave de API
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href="https://openrouter.ai/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Abrir claves de OpenRouter
            </Button>
          </>
        }
      />
    </div>
  );
}

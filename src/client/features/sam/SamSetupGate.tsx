import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";

export function SamSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title="Activa las funciones de IA"
      description={
        <>
          {isEveryAppClientAuthMode() ? (
            <p>
              SAM, el agente de IA integrado en OpenSEO, usa OpenRouter a través
              de tu gateway de Every App. Un administrador crea una clave en
              OpenRouter y la configura en el gateway con{" "}
              <code>pnpm everyapp secret set OPENROUTER_API_KEY</code>; después,
              confírmalo aquí.
            </p>
          ) : (
            <p>
              SAM, el agente de IA integrado en OpenSEO, necesita una clave de
              API de OpenRouter. Crea una clave en OpenRouter, configúrala como
              la variable de entorno <code>OPENROUTER_API_KEY</code>, reinicia
              OpenSEO y confírmalo aquí.
            </p>
          )}
          <p className="text-xs">
            Tienes las instrucciones paso a paso para cada despliegue en la{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/help/openrouter-api-key"
            >
              guía de configuración de la clave de API de OpenRouter
            </Link>
            .
          </p>
        </>
      }
      actions={
        <>
          <Button size="lg" pending={isRefetching} onClick={onRetry}>
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
    >
      {errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription className="text-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </GateCard>
  );
}

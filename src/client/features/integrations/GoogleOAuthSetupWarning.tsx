import { AlertTriangle, Info } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";

const EVERY_APP_GOOGLE_SETUP_URL =
  "https://everyapp.com/docs/providers/google#connect-accounts";

export function GoogleOAuthSetupWarning({
  integrationName,
  docsUrl,
}: {
  integrationName: string;
  docsUrl: string;
}) {
  if (isEveryAppClientAuthMode()) {
    // Google connects through the gateway, which holds the Google client;
    // OpenSEO holds none here (server/features/google/googleAccess.ts).
    return (
      <Alert variant="info">
        <Info className="size-4" />
        <AlertTitle>Añade primero Google a Every App</AlertTitle>
        <AlertDescription>
          <p>
            Un propietario o administrador lo hace una sola vez: crea un cliente
            OAuth de Google con la URI de redirección{" "}
            <code>
              https://&lt;tu gateway&gt;/connect/google-workspace/callback
            </code>
            , y pega su ID de cliente y su secreto en Every App, en Manage
            workspace → Providers, o ejecuta{" "}
            <code>
              pnpm everyapp secret set GOOGLE_WORKSPACE_CLIENT_ID
              GOOGLE_WORKSPACE_CLIENT_SECRET
            </code>
            . Después conecta {integrationName} aquí.
          </p>
          <SafeExternalLink
            url={EVERY_APP_GOOGLE_SETUP_URL}
            label="Cómo añadir un proveedor"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
          />
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertTitle>Cliente OAuth de Google sin configurar</AlertTitle>
      <AlertDescription>
        <p>
          Añade tu ID de cliente y tu secreto de Google a esta instalación de
          OpenSEO antes de conectar {integrationName}.
        </p>
        <SafeExternalLink
          url={docsUrl}
          label="Abrir guía de configuración"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        />
      </AlertDescription>
    </Alert>
  );
}

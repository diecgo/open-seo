import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { AppBanner } from "@/client/layout/AppBanner";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

function SeoApiStatusBanners({
  shouldShowSeoApiWarning,
  seoApiKeyStatusError,
}: {
  shouldShowSeoApiWarning: boolean;
  seoApiKeyStatusError: boolean;
}) {
  const icon = <AlertTriangle className="size-4 shrink-0" />;
  const helpLink = (
    <Link
      {...dataforseoHelpLinkOptions}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      página de ayuda
    </Link>
  );
  return (
    <>
      {shouldShowSeoApiWarning ? (
        <AppBanner variant="warning" icon={icon}>
          {isEveryAppClientAuthMode() ? (
            <>
              DataForSEO aún no está configurado en tu gateway de Every App. Un
              propietario o administrador lo configura con{" "}
              <code>pnpm everyapp secret set DATAFORSEO_API_KEY</code>, o{" "}
              <code>TREG_API_TOKEN</code> para usar treg. Tienes los pasos en la{" "}
              {helpLink}.
            </>
          ) : (
            <>
              Falta configurar: añade tu clave API de DataForSEO para usar las
              funciones de OpenSEO. Tienes los pasos rápidos en la {helpLink}.
            </>
          )}
        </AppBanner>
      ) : null}

      {seoApiKeyStatusError ? (
        <AppBanner variant="info" icon={icon}>
          No hemos podido verificar tu configuración de DataForSEO. Si algo no
          funciona, revisa los pasos de configuración en la {helpLink}.
        </AppBanner>
      ) : null}
    </>
  );
}

const DOCKER_MOVE_URL =
  "https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md#move-from-the-old-docker-image";
const DOCKER_MOVE_DISMISSED_KEY = "openseo:docker-move-dismissed";

// The old single-container Docker image builds the app at startup with this
// flag set (deploy/docker/Dockerfile), so only its users see the notice.
function LegacyDockerBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DOCKER_MOVE_DISMISSED_KEY) === "1",
  );
  if (import.meta.env.VITE_OPENSEO_LEGACY_DOCKER !== "true" || dismissed) {
    return null;
  }
  return (
    <AppBanner variant="info" icon={<Info className="size-4 shrink-0" />}>
      La nueva instalación de OpenSEO con Docker arranca en segundos y admite
      cuentas. Esta imagen sigue recibiendo actualizaciones y al migrar
      conservas tus datos.{" "}
      <a
        href={DOCKER_MOVE_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Cómo migrar
      </a>{" "}
      ·{" "}
      <button
        type="button"
        className="font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => {
          localStorage.setItem(DOCKER_MOVE_DISMISSED_KEY, "1");
          setDismissed(true);
        }}
      >
        Descartar
      </button>
    </AppBanner>
  );
}

function MissingSeoSetupModal({ onClose }: { onClose: () => void }) {
  const everyApp = isEveryAppClientAuthMode();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <div className="rounded-full bg-warning/20 p-2 text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <DialogTitle>
              {everyApp
                ? "DataForSEO aún no está configurado"
                : "Un paso rápido de configuración"}
            </DialogTitle>
            <DialogDescription>
              {everyApp ? (
                <>
                  Un propietario o administrador lo configura en tu gateway de
                  Every App con{" "}
                  <code>pnpm everyapp secret set DATAFORSEO_API_KEY</code>, o{" "}
                  <code>TREG_API_TOKEN</code> para usar treg.
                </>
              ) : (
                "Añade tu clave API de DataForSEO para empezar a usar OpenSEO."
              )}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Descartar
          </Button>
          <Button
            nativeButton={false}
            render={<Link {...dataforseoHelpLinkOptions} onClick={onClose} />}
          >
            Abrir la guía de configuración
            <ExternalLink className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LegacyDockerBanner, MissingSeoSetupModal, SeoApiStatusBanners };

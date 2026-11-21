import { useEffect, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { getClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { getSignInHref, getSignInHrefForLocation } from "@/lib/auth-redirect";

const CLOUDFLARE_SETUP_GUIDE_URL =
  "https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE.md#2-configure-authentication-and-secrets";

type CardProps = {
  message: string;
  onRetry: () => void;
};

/**
 * The card for an auth failure, else `fallback`. The route error boundary and
 * the landing redirect both render errors through this, so each auth error
 * code shows the same card everywhere.
 */
export function AuthErrorCard({
  error,
  onRetry,
  fallback,
}: {
  error: unknown;
  onRetry: () => void;
  fallback: ReactNode;
}) {
  const errorCode = getErrorCode(error);
  if (errorCode !== "AUTH_CONFIG_MISSING" && errorCode !== "UNAUTHENTICATED") {
    return fallback;
  }

  const message = getStandardErrorMessage(
    error,
    "Algo ha fallado. Vuelve a intentarlo.",
  );
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center p-4">
      {errorCode === "AUTH_CONFIG_MISSING" ? (
        <AuthConfigErrorCard message={message} onRetry={onRetry} />
      ) : (
        <UnauthenticatedErrorCard message={message} onRetry={onRetry} />
      )}
    </div>
  );
}

function AuthConfigErrorCard({ message, onRetry }: CardProps) {
  // The hint names the settings of the mode the server actually runs; the
  // alert above already carries the server's exact message.
  const clientAuthMode = getClientAuthMode();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-destructive" />
          Falta configurar la autenticación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {clientAuthMode === "hosted" ? (
          <p className="text-muted-foreground">
            El modo alojado necesita{" "}
            <code className="mx-1">BETTER_AUTH_SECRET</code>
            (32 caracteres o más), <code className="mx-1">
              BETTER_AUTH_URL
            </code>{" "}
            y credenciales de Google OAuth en la instalación.
          </p>
        ) : null}
        {clientAuthMode === "everyapp" ? (
          <p className="text-muted-foreground">
            OpenSEO funciona detrás de un gateway de Every App, que es el que
            inicia la sesión. Instálalo con{" "}
            <code className="mx-1">pnpm everyapp install</code> para que reciba
            las claves de identidad del gateway y ábrelo a través del gateway.
          </p>
        ) : null}
        {clientAuthMode === "cloudflare_access" ? (
          <p className="text-muted-foreground">
            El modo Cloudflare Access necesita
            <code className="mx-1">TEAM_DOMAIN</code> (una URL https completa) y
            <code className="mx-1">POLICY_AUD</code> configurados en la
            instalación, con una aplicación de Access que proteja este dominio.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" onClick={onRetry}>
          Reintentar
        </Button>
        <Button
          nativeButton={false}
          render={
            <a
              href={CLOUDFLARE_SETUP_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Abrir la guía de configuración
        </Button>
      </CardFooter>
    </Card>
  );
}

function UnauthenticatedErrorCard({ message, onRetry }: CardProps) {
  // A sign-in page exists wherever Better Auth accounts do.
  const hasSignIn = usesBetterAuthClient();
  const signInHref =
    typeof window === "undefined"
      ? getSignInHref("/")
      : getSignInHrefForLocation(window.location);

  useEffect(() => {
    if (typeof window === "undefined" || !hasSignIn) {
      return;
    }

    window.location.replace(signInHref);
  }, [hasSignIn, signInHref]);

  if (hasSignIn) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Necesitas autenticarte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-muted-foreground">
        <p>{message}</p>
        <p>
          Esta instalación usa autenticación externa. Renueva tu sesión de
          acceso y vuelve a intentarlo.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onRetry}>Reintentar</Button>
      </CardFooter>
    </Card>
  );
}

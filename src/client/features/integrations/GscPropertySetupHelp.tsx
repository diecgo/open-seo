import { Button } from "@/client/components/ui/button";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

export function GscPropertySetupHelp({
  accounts,
  loading,
  busy,
  linking,
  onRetry,
  onReconnect,
}: {
  accounts: GooglePickerAccount[];
  loading: boolean;
  busy: boolean;
  linking: boolean;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  return (
    <>
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <h2 className="font-semibold">No hemos encontrado tu sitio web</h2>
        <p className="break-words text-muted-foreground">
          Hemos revisado{" "}
          {accounts
            .map(
              (account) =>
                account.email ??
                `Cuenta de Google · ${account.accountId.slice(-6)}`,
            )
            .join(", ")}
          .
        </p>
        <p className="text-muted-foreground">
          Añade tu sitio a Search Console o pide a quien lo gestione que dé
          acceso a
          {accounts.length === 1 ? " esta cuenta" : " una de estas cuentas"}.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Abrir Search Console ↗
          </a>
          <a
            href="https://openseo.so/blogs/google-search-console-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Guía de configuración
          </a>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={loading || busy}
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          disabled={loading || busy}
          pending={linking}
        >
          {linking ? "Abriendo Google…" : "Usar otra cuenta de Google"}
        </Button>
      </div>
    </>
  );
}

export function hasNoGscWebsites(
  accounts: GooglePickerAccount[],
  loading: boolean,
  error: boolean,
) {
  return (
    !loading &&
    !error &&
    accounts.length > 0 &&
    accounts.every(
      (account) =>
        !account.requiresReconnect &&
        !account.unavailable &&
        account.properties.length === 0,
    )
  );
}

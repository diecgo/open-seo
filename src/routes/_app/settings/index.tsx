import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
import { ImportFromSelfHosted } from "@/client/features/every-app/ImportFromSelfHosted";
import { MoveToEveryAppSettings } from "@/client/features/every-app/MoveToEveryAppSettings";
import { DeleteAccountSettings } from "@/client/features/settings/DeleteAccountSettings";
import { McpConnectionsSettings } from "@/client/features/settings/McpConnectionsSettings";
import { PrivacySettings } from "@/client/features/settings/PrivacySettings";
import {
  isEveryAppClientAuthMode,
  isHostedClientAuthMode,
  usesBetterAuthClient,
} from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();
  // API keys need Better Auth accounts (hosted or the standalone Docker
  // edition); the analytics choices only exist on hosted.
  const hasAccounts = usesBetterAuthClient();
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionHeader title="Apariencia" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm">Tema</span>
          <ThemePreferenceRadio />
        </div>
      </section>

      {isEveryAppClientAuthMode() ? <EveryAppSettings /> : null}

      {isHosted ? <McpConnectionsSettings /> : null}

      {hasAccounts ? <ApiKeySettings /> : null}

      {isHosted || isEveryAppClientAuthMode() ? null : (
        <MoveToEveryAppSettings />
      )}

      {isHosted ? (
        <PrivacySettings />
      ) : (
        <section className="space-y-3">
          <SectionHeader title="Acerca de" />
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm">Versión</span>
            <span className="font-mono text-sm text-muted-foreground">
              v{version}
            </span>
          </div>
        </section>
      )}

      {isHosted ? <DeleteAccountSettings /> : null}
    </div>
  );
}

// Behind an Every App gateway, which owns the account, the team and the AI
// connections: say so, link back, and take a move from a self-hosted install.
function EveryAppSettings() {
  const { data: account } = useQuery(everyAppAccountQueryOptions());
  return (
    <section className="space-y-3">
      <SectionHeader title="Every App" />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm">Cuenta y equipo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu cuenta, tu equipo y tus conexiones de IA se gestionan en Every
              App.
            </p>
          </div>
          {account?.gatewayUrl ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<a href={account.gatewayUrl} />}
            >
              Abrir Every App
            </Button>
          ) : null}
        </div>
        <ImportFromSelfHosted />
      </div>
    </section>
  );
}

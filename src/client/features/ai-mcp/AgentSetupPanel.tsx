import type { ComponentProps, ReactNode } from "react";
import { Package } from "lucide-react";
import { CopyButton } from "@/client/components/CopyButton";

export const AGENT_SETUP_DESCRIPTION =
  "Pega este prompt en tu agente para que configure OpenSEO automáticamente.";

export function AgentSetupPanel({
  prompt,
  onCopy,
  copyVariant = "default",
  actions,
  children,
}: {
  prompt: string;
  onCopy?: () => void;
  copyVariant?: ComponentProps<typeof CopyButton>["variant"];
  /** Buttons shown side by side under the copy button, e.g. one-click installs. */
  actions?: ReactNode;
  /** Shown under the copy button, e.g. what to do after copying. */
  children?: ReactNode;
}) {
  return (
    <>
      <div className="rounded-xl border border-border bg-background/25 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <Package className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium">Plugin de OpenSEO</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Conexión MCP + skills de SEO
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <CopyButton
            variant={copyVariant}
            size="lg"
            className="w-full"
            value={prompt}
            label="Copiar prompt de configuración"
            successMessage="Prompt de configuración copiado"
            onCopy={onCopy}
          />
          {actions ? (
            <div className="grid grid-cols-2 gap-2">{actions}</div>
          ) : null}
        </div>
        {children}
      </div>
      <div className="mt-4 text-center">
        <a
          href="https://openseo.so/docs/agent-setup"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline decoration-muted-foreground/25 underline-offset-4 hover:text-foreground"
        >
          Configuración manual
        </a>
      </div>
    </>
  );
}

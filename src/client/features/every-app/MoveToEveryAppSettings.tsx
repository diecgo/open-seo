import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { SectionHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Progress } from "@/client/components/ui/progress";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { CommandBlock } from "@/client/features/help/SecretHelpPage";
import { Step } from "@/client/features/every-app/Step";
import { hasOrgPermission } from "@/lib/org-permissions";
import {
  MovePhase,
  runMove,
  type MoveState,
} from "@/client/features/every-app/runEveryAppMove";
import { parseTransferCode } from "@/shared/every-app-transfer";

enum GatewayPath {
  SetUp = "set-up",
  Existing = "existing",
}

/** Settings → Move to Every App, on self-hosted installs, for owners. */
export function MoveToEveryAppSettings() {
  const { data: organization } = useQuery(organizationContextQueryOptions());
  const [open, setOpen] = useState(false);
  if (
    !organization ||
    !hasOrgPermission(organization.role, { organization: ["delete"] })
  ) {
    return null;
  }
  return (
    <section className="space-y-3">
      <SectionHeader title="Every App" />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Pasar a Every App</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicio de sesión para todo el equipo y todas tus apps en un mismo
            sitio. Todos los proyectos, el historial y los chats pasan intactos.{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://everyapp.com/docs/apps/openseo"
              target="_blank"
              rel="noreferrer"
            >
              Acerca de Every App
            </a>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Pasar a Every App
        </Button>
      </div>
      {open ? <MoveDialog onClose={() => setOpen(false)} /> : null}
    </section>
  );
}

function MoveDialog({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState(GatewayPath.SetUp);
  const [state, setState] = useState<MoveState>({ status: "idle" });
  const stopped = useRef(false);
  const moving = state.status === "moving";

  const close = () => {
    stopped.current = true;
    onClose();
  };

  return (
    <Dialog
      open
      // A click outside or Escape mustn't stop a move halfway.
      onOpenChange={(next) => {
        if (!next && !moving) close();
      }}
    >
      <DialogContent className="grid-cols-1 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pasar a Every App</DialogTitle>
          <DialogDescription>
            Copia tus proyectos y su historial al OpenSEO de tu Gateway. Aquí no
            se elimina nada.
          </DialogDescription>
        </DialogHeader>
        {state.status === "moving" ? (
          <MoveProgress state={state} />
        ) : state.status === "done" ? (
          <MoveDone origin={state.origin} />
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                ¿Ya tienes un Gateway de Every App?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  aria-pressed={path === GatewayPath.SetUp}
                  className="aria-pressed:border-primary aria-pressed:bg-primary/10"
                  onClick={() => setPath(GatewayPath.SetUp)}
                >
                  Configurar mi Gateway
                </Button>
                <Button
                  variant="outline"
                  aria-pressed={path === GatewayPath.Existing}
                  className="aria-pressed:border-primary aria-pressed:bg-primary/10"
                  onClick={() => setPath(GatewayPath.Existing)}
                >
                  Ya tengo un Gateway
                </Button>
              </div>
            </div>
            {path === GatewayPath.SetUp ? (
              <GatewaySetupSteps
                onReady={() => setPath(GatewayPath.Existing)}
              />
            ) : (
              <MoveSteps
                failure={state.status === "failed" ? state.message : null}
                onMove={(code) => {
                  stopped.current = false;
                  void runMove(code, setState, stopped);
                }}
              />
            )}
          </>
        )}
        <DialogFooter>
          <Button
            variant={state.status === "done" ? "default" : "ghost"}
            onClick={close}
          >
            {state.status === "done"
              ? "Hecho"
              : moving
                ? "Detener"
                : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GatewaySetupSteps({ onReady }: { onReady: () => void }) {
  return (
    <ol className="space-y-4">
      <Step number={1} title="Instala Every App">
        <CommandBlock command="npm install -g everyapp@latest" />
      </Step>
      <Step number={2} title="Crea tu Gateway">
        <CommandBlock command="everyapp setup" />
        <p className="text-sm text-muted-foreground">
          Necesitas{" "}
          <a
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="https://dash.cloudflare.com/"
            target="_blank"
            rel="noreferrer"
          >
            Cloudflare Workers Paid
          </a>{" "}
          y un dominio en Cloudflare DNS.
        </p>
      </Step>
      <li>
        <Button variant="outline" onClick={onReady}>
          Mi Gateway está listo
        </Button>
      </li>
    </ol>
  );
}

function MoveSteps({
  failure,
  onMove,
}: {
  failure: string | null;
  onMove: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const codeIsValid = parseTransferCode(code) !== null;

  return (
    <ol className="space-y-4">
      <Step number={1} title="Instala OpenSEO en tu Gateway">
        <CommandBlock command="everyapp install https://github.com/every-app/open-seo" />
      </Step>
      <Step number={2} title="Crea un código de transferencia">
        <p className="text-sm text-muted-foreground">
          En el OpenSEO de tu Gateway, abre Ajustes y pulsa Importar desde
          OpenSEO autoalojado.
        </p>
      </Step>
      <Step number={3} title="Pega aquí el código">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (codeIsValid) onMove(code);
          }}
        >
          <Label htmlFor="every-app-transfer-code" className="sr-only">
            Código de transferencia
          </Label>
          <Input
            id="every-app-transfer-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="https://openseo.tudominio.com#…"
            autoComplete="off"
            spellCheck={false}
            data-ph-mask
          />
          {failure ? (
            <p className="text-sm text-destructive" role="alert">
              {failure}
            </p>
          ) : null}
          <Button type="submit" disabled={!codeIsValid}>
            Pasar mis datos
          </Button>
        </form>
      </Step>
    </ol>
  );
}

const PHASE_LABELS: Record<MovePhase, string> = {
  [MovePhase.Data]: "Pasando proyectos e historial",
  [MovePhase.Chats]: "Pasando chats de SAM",
  [MovePhase.Files]: "Pasando archivos de auditorías y exportaciones",
};

function MoveProgress({
  state,
}: {
  state: Extract<MoveState, { status: "moving" }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">{PHASE_LABELS[state.phase]}</span>
        {state.phase === MovePhase.Files ? (
          <span className="text-muted-foreground tabular-nums">
            {state.done.toLocaleString()} archivos
          </span>
        ) : null}
      </div>
      <Progress
        value={state.phase === MovePhase.Files ? null : state.done}
        max={Math.max(state.total, 1)}
      />
      <p className="text-sm text-muted-foreground">
        Mantén esta página abierta hasta que termine.
      </p>
    </div>
  );
}

function MoveDone({ origin }: { origin: string }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">Tus datos ya están en Every App.</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          Allí cada persona tendrá que volver a conectar Google para Search
          Console y Analytics.
        </li>
        <li>
          Esta instalación sigue ejecutando las comprobaciones programadas.
          Apágala cuando estés conforme con la migración o se ejecutarán dos
          veces.
        </li>
      </ul>
      <a
        className="inline-block font-medium text-primary underline-offset-4 hover:underline"
        href={origin}
        target="_blank"
        rel="noreferrer"
      >
        Abrir el OpenSEO de tu Gateway →
      </a>
    </div>
  );
}

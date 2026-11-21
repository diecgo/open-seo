import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CopyButton } from "@/client/components/CopyButton";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Step } from "@/client/features/every-app/Step";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { hasOrgPermission } from "@/lib/org-permissions";
import { createEveryAppTransferCode } from "@/serverFunctions/everyAppTransfer";
import { version } from "../../../../package.json";

/**
 * The Import from self-hosted OpenSEO row in Settings → Every App, for owners
 * and admins: the transfer code a self-hosted OpenSEO pastes into its Move to
 * Every App dialog.
 */
export function ImportFromSelfHosted() {
  const { data: organization } = useQuery(organizationContextQueryOptions());
  const [open, setOpen] = useState(false);
  if (
    !organization ||
    !hasOrgPermission(organization.role, { organization: ["update"] })
  ) {
    return null;
  }
  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Importar desde OpenSEO autoalojado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Trae los proyectos, el historial y los chats de un OpenSEO que
            alojas tú mismo.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Importar
        </Button>
      </div>
      {open ? <ImportDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const createCode = useMutation({
    mutationFn: () => createEveryAppTransferCode(),
  });
  const code = createCode.data?.code;
  // The server makes no code while another move is still sending.
  const moveRunning = createCode.data === null;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="grid-cols-1 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar desde OpenSEO autoalojado</DialogTitle>
          <DialogDescription>
            Copia aquí sus proyectos y su historial.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-4">
          <Step
            number={1}
            title={`Actualiza tu OpenSEO autoalojado a la v${version}`}
          />
          <Step number={2} title="Crea un código de transferencia">
            {code ? (
              <>
                <div className="flex items-center gap-2">
                  <code
                    className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2.5 py-2 font-mono text-xs whitespace-nowrap"
                    data-ph-mask
                  >
                    {code}
                  </code>
                  <CopyButton
                    value={code}
                    successMessage="Código de transferencia copiado"
                    label="Copiar código de transferencia"
                    variant="ghost"
                    size="icon-sm"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Funciona una sola vez, durante 24 horas.
                </p>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={createCode.isPending}
                onClick={() => createCode.mutate()}
              >
                Crear código
              </Button>
            )}
            {moveRunning ? (
              <p className="text-sm text-destructive" role="alert">
                Ya hay una migración en curso. Vuelve a intentarlo cuando
                termine.
              </p>
            ) : null}
            {createCode.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {getStandardErrorMessage(createCode.error)}
              </p>
            ) : null}
          </Step>
          <Step number={3} title="Pégalo en tu OpenSEO autoalojado">
            <p className="text-sm text-muted-foreground">
              Ajustes → Pasar a Every App → Ya tengo un Gateway
            </p>
          </Step>
        </ol>
        <DialogFooter>
          <Button variant={code ? "default" : "ghost"} onClick={onClose}>
            {code ? "Hecho" : "Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

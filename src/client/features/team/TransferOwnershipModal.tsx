import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { getErrorCode } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { transferOwnership } from "@/serverFunctions/organization";

// NOT_FOUND: the member left. FORBIDDEN: the caller is no longer the owner
// (another tab). CONFLICT: a row changed mid-transfer.
function isTeamChangedError(error: Error) {
  const code = getErrorCode(error);
  return code === "CONFLICT" || code === "NOT_FOUND" || code === "FORBIDDEN";
}

export function TransferOwnershipModal({
  member,
  onClose,
  onTransferred,
}: {
  member: { id: string; user: { name?: string | null; email: string } };
  onClose: () => void;
  onTransferred: () => void;
}) {
  const displayName = member.user.name || member.user.email;

  const transferMutation = useMutation({
    mutationFn: () => transferOwnership({ data: { memberId: member.id } }),
    onSuccess: () => {
      captureClientEvent("team:ownership_transfer");
      toast.success(`${displayName} es ahora el propietario`);
      onTransferred();
      onClose();
    },
    onError: (error: Error) => {
      const teamChanged = isTeamChangedError(error);
      toast.error(
        teamChanged
          ? "Tu equipo ha cambiado mientras esto estaba abierto. La propiedad no ha cambiado."
          : "No hemos podido transferir la propiedad. La propiedad no ha cambiado.",
      );
      // Refresh either way so the list and the caller's role are current.
      onTransferred();
      // The confirmation is stale once the team changed: close it so the
      // refreshed list shows who is still there. Other errors keep it open
      // for a retry.
      if (teamChanged) onClose();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !transferMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Transferir la propiedad?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground" data-ph-mask>
              {displayName}
            </span>{" "}
            pasa a ser el propietario de esta organización y gestiona su
            facturación. Tú pasas a ser Administrador y mantienes el acceso
            completo a todos los proyectos.
          </DialogDescription>
          <DialogDescription>
            Los proyectos, los datos y la suscripción se quedan en la
            organización. Solo el nuevo propietario puede volver a transferir la
            propiedad.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={transferMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            pending={transferMutation.isPending}
          >
            Transferir la propiedad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

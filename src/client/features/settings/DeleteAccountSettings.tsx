import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import {
  getAccountDeletionStatus,
  requestAccountDeletion,
} from "@/serverFunctions/account-deletion";
import { formatDeletionDate } from "@/shared/account-deletion";

type Status = Awaited<ReturnType<typeof getAccountDeletionStatus>>;

function blockerText(blocker: Status["blockers"][number]) {
  const others =
    blocker.otherMemberCount === 1
      ? "1 miembro más"
      : `${blocker.otherMemberCount} miembros más`;
  return `Eres propietario de “${blocker.organizationName}”, que tiene ${others}. Si eliminas tu cuenta, se quedarían sin propietario. Quítalos en los ajustes de la organización o escribe a support@openseo.so para pasarle el espacio de trabajo a uno de ellos.`;
}

function billingText(charge: Status["billingToStop"][number]) {
  const stops = [
    charge.renewingPlan ? "cancelaremos su plan de pago" : null,
    charge.autoReload ? "desactivaremos la recarga automática" : null,
  ]
    .filter(Boolean)
    .join(" y ");
  return `“${charge.organizationName}”: ${stops}.`;
}

function deletionErrorMessage(error: unknown) {
  switch (getErrorCode(error)) {
    case "FORBIDDEN":
      return "Por seguridad, cierra sesión, vuelve a iniciarla y reinténtalo.";
    case "VALIDATION_ERROR":
      return "Aún no se puede eliminar tu cuenta. Vuelve a pulsar Eliminar cuenta para ver por qué.";
    case "CONFLICT":
      return "Tu cuenta ya está programada para eliminarse.";
    default:
      return getStandardErrorMessage(error);
  }
}

export function DeleteAccountSettings() {
  const [open, setOpen] = useState(false);
  const statusQuery = useQuery({
    queryKey: ["accountDeletionStatus"],
    queryFn: () => getAccountDeletionStatus(),
    // The fresh sign-in window runs out while the page sits open.
    staleTime: 0,
  });
  const status = statusQuery.data;

  return (
    <section className="space-y-3">
      <SectionHeader title="Eliminar cuenta" />
      <p className="text-sm text-muted-foreground">
        Elimina para siempre tu cuenta y todos los espacios de trabajo en los
        que eres el único miembro, con todos sus proyectos y datos. Se cerrará
        tu sesión al momento y la eliminación se hará{" "}
        {status ? `${status.deletionDelayDays} días` : "dos semanas"} después.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
        disabled={!status}
        onClick={() => setOpen(true)}
      >
        Eliminar cuenta
      </Button>

      {open && status ? (
        status.blockers.length > 0 ? (
          <BlockedDialog status={status} onClose={() => setOpen(false)} />
        ) : !status.signedInRecently ? (
          <SignInAgainDialog onClose={() => setOpen(false)} />
        ) : (
          <DeleteAccountDialog status={status} onClose={() => setOpen(false)} />
        )
      ) : null}
    </section>
  );
}

function BlockedDialog({
  status,
  onClose,
}: {
  status: Status;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aún no puedes eliminar tu cuenta</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <ul className="list-disc space-y-1 pl-5 text-left">
              {status.blockers.map((blocker) => (
                <li key={blocker.organizationName}>{blockerText(blocker)}</li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cerrar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SignInAgainDialog({ onClose }: { onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Vuelve a iniciar sesión para continuar
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por seguridad, cierra sesión y vuelve a iniciarla antes de eliminar
            tu cuenta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={() => signOutAndRedirect()}>Cerrar sesión</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteAccountDialog({
  status,
  onClose,
}: {
  status: Status;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [confirmEmail, setConfirmEmail] = useState("");
  const email = session?.user.email ?? "";
  const matches =
    email !== "" && confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const mutation = useMutation({
    mutationFn: () => requestAccountDeletion({ data: { confirmEmail } }),
    onSuccess: ({ deleteAfter }) => {
      toast.success(
        `Tu cuenta se eliminará el ${formatDeletionDate(deleteAfter)}.`,
      );
      signOutAndRedirect();
    },
    onError: (error) => {
      toast.error(deletionErrorMessage(error));
      // A blocker or an expired sign-in found by the server: reopening the
      // dialog shows the explanation.
      void queryClient.invalidateQueries({
        queryKey: ["accountDeletionStatus"],
      });
      onClose();
    },
  });

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
          <AlertDialogDescription>
            Se cerrará tu sesión ahora y se cancelarán los planes de pago y las
            recargas automáticas de los espacios de trabajo que se eliminen con
            tu cuenta. No se puede deshacer tras la fecha de eliminación.
            Escribe tu email para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {status.billingToStop.length > 0 ? (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>
              Al eliminar tu cuenta se detiene la facturación
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                {status.billingToStop.map((charge) => (
                  <li key={charge.organizationName}>{billingText(charge)}</li>
                ))}
              </ul>
              <p className="mt-2">
                Un plan cancelado no se renueva y conservas sus créditos hasta
                la fecha de eliminación.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        <Input
          value={confirmEmail}
          onChange={(event) => setConfirmEmail(event.target.value)}
          placeholder={email}
          aria-label="Tu email"
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches}
            pending={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Eliminar cuenta
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

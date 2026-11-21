import { useMutation } from "@tanstack/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
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
import { isHostedClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { sendTeamInvitation } from "@/serverFunctions/organization";

const inviteSchema = z.object({
  email: z.string().trim().email("Introduce un email válido."),
});

export function inviteErrorMessage(error: Error) {
  const code = getErrorCode(error);
  if (code === "RATE_LIMITED") {
    return "Has alcanzado el límite de invitaciones de hoy. Vuelve a intentarlo mañana.";
  }
  if (code === "UPSTREAM_UNAVAILABLE") {
    return "La invitación se ha guardado, pero no se ha podido enviar el email. Usa Reenviar dentro de un momento para reintentarlo.";
  }
  return "No hemos podido enviar esa invitación.";
}

// Without an email transport (the standalone Docker edition) the server hands
// back the invitation link for the inviter to pass on; with one, it was sent.
export function announceInvitation(
  result: { invitationId: string; inviteUrl?: string },
  sentMessage: string,
) {
  if (!result.inviteUrl) {
    toast.success(sentMessage);
    return;
  }
  const inviteUrl = result.inviteUrl;
  void (
    navigator.clipboard?.writeText(inviteUrl) ?? Promise.reject(new Error())
  ).then(
    () => toast.success("Enlace de invitación copiado"),
    () =>
      toast.success("Enlace de invitación", {
        description: inviteUrl,
        duration: 20000,
      }),
  );
}

export function InviteTeammateModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  // Server function (not authClient.inviteMember): it enforces the daily send
  // limits and fails visibly when the invite email doesn't send.
  const inviteMutation = useMutation({
    mutationFn: (inviteeEmail: string) =>
      sendTeamInvitation({ data: { email: inviteeEmail } }),
    onSuccess: (result) => {
      captureClientEvent("team:invitation_send");
      announceInvitation(result, "Invitación enviada");
      onInvited();
      onClose();
    },
    onError: (error: Error) => {
      if (getErrorCode(error) === "CONFLICT") {
        form.setErrorMap({
          onSubmit: { fields: { email: "Esta persona ya es miembro." } },
        });
      } else {
        toast.error(inviteErrorMessage(error));
      }
      // An email-send failure still creates the pending row — show it.
      onInvited();
    },
  });

  const sharesLink = usesBetterAuthClient() && !isHostedClientAuthMode();

  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: inviteSchema },
    onSubmit: ({ value }) => inviteMutation.mutateAsync(value.email.trim()),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !inviteMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Invitar a un compañero</DialogTitle>
              <DialogDescription>
                {sharesLink
                  ? "Se unirá como Administrador con acceso completo a todos los proyectos. Compártele el enlace de invitación; desde ahí creará su cuenta. Caduca en 7 días."
                  : "Se unirá como Administrador con acceso completo a todos los proyectos salvo a la facturación. El enlace de invitación caduca en 7 días."}
              </DialogDescription>
            </DialogHeader>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="Email"
                  type="email"
                  placeholder="companero@empresa.com"
                  required
                  autoFocus
                />
              )}
            </form.AppField>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={inviteMutation.isPending}
              >
                Cancelar
              </Button>
              <form.SubmitButton>Enviar invitación</form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}

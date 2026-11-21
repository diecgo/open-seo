import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import { Skeleton } from "@/client/components/ui/skeleton";
import { UpdateCardButton } from "@/client/features/billing/AutoReloadNotice";
import type { PlanOffer } from "@/client/features/billing/plan-offers";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { queryClient } from "@/client/tanstack-db";
import { previewPlanUpgrade, upgradePlan } from "@/serverFunctions/billing";
import { BILLING_ROUTE } from "@/shared/billing";

const usd = (amount: number) => `$${amount.toFixed(2)}`;

function upgradeErrorMessage(error: unknown, fallback: string) {
  // A charge that got no answer may still land, so ask for a look before
  // another try. The standard message for the code is about auto-reload.
  if (getErrorCode(error) === "PAYMENT_ACTION_REQUIRED") {
    return "Tu banco necesita más tiempo o una confirmación para este cargo. Revisa tu plan en la página de Facturación dentro de un minuto antes de volver a intentarlo.";
  }
  return getStandardErrorMessage(error, fallback);
}

/**
 * Confirms an upgrade with what it charges today, the credits the
 * organization will have and when the plan renews. The plan starts over
 * today, and credits left from the current plan carry over until then.
 */
export function UpgradePlanDialog({
  open,
  onOpenChange,
  offer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: PlanOffer;
}) {
  const navigate = useNavigate();
  const previewQuery = useQuery({
    queryKey: ["billing", "upgrade-preview", offer.planId],
    queryFn: () => previewPlanUpgrade({ data: { planId: offer.planId } }),
    enabled: open,
    // The charge depends on today's balance and plan.
    staleTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => upgradePlan({ data: { planId: offer.planId } }),
    // Errors show in the dialog, with the portal when the card is the problem.
    meta: { errorToast: false },
    onSuccess: async ({ paymentUrl }) => {
      if (paymentUrl) {
        window.location.assign(paymentUrl);
        return;
      }
      // Billing opens on the new plan, so its reads finish first. The
      // preview was for the plan just bought and would now be refused.
      await queryClient.invalidateQueries({
        queryKey: ["billing"],
        predicate: (query) => query.queryKey[1] !== "upgrade-preview",
      });
      toast.success(`Ya tienes el ${offer.name}`);
      void navigate({ to: BILLING_ROUTE });
    },
  });
  // Stays pending through the redirect after a success.
  const upgrading = mutation.isPending || mutation.isSuccess;
  const preview = previewQuery.data;
  const error = mutation.error ?? previewQuery.error;

  function handleOpenChange(next: boolean) {
    if (upgrading) return;
    // A failed attempt's error belongs to that attempt.
    if (!next) mutation.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mejorar al {offer.name}</DialogTitle>
          <DialogDescription>
            Tu plan vuelve a empezar hoy. Los créditos que no hayas usado se
            mantienen hasta que se renueve.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          // What they pay, then, set apart below, the credits they get: both
          // are dollar amounts, so they must not read as one list.
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">A pagar hoy</dt>
              <dd className="font-medium tabular-nums">
                {usd(preview.chargeUsd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Después</dt>
              <dd className="tabular-nums">{usd(preview.renewalUsd)}/mes</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-muted-foreground">
                Créditos de uso hasta el {renewalDate(preview.renewsAt)}
                {preview.carriedUsd > 0 ? (
                  <span className="block text-xs tabular-nums">
                    {usd(offer.monthlyCreditsUsd)} del plan +{" "}
                    {usd(preview.carriedUsd)} sin usar
                  </span>
                ) : null}
              </dt>
              <dd className="font-medium tabular-nums">
                {usd(offer.monthlyCreditsUsd + preview.carriedUsd)}
              </dd>
            </div>
          </dl>
        ) : previewQuery.isPending ? (
          <div aria-busy className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : null}

        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {upgradeErrorMessage(
                error,
                mutation.error
                  ? "No hemos podido mejorar tu plan. Vuelve a intentarlo."
                  : "No hemos podido calcular el precio de esta mejora. Vuelve a intentarlo.",
              )}
            </p>
            {getErrorCode(error) === "PAYMENT_METHOD_REQUIRED" ? (
              <UpdateCardButton />
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={upgrading}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            pending={upgrading}
            disabled={!preview || upgrading}
            onClick={() => mutation.mutate()}
          >
            {preview ? `Pagar ${usd(preview.chargeUsd)} y mejorar` : "Mejorar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// e.g. "Dec 21", like the refill date on the Billing page.
function renewalDate(at: number) {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

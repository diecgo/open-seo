import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import type { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { SUPPORT_EMAIL } from "@/client/lib/support";
import { createBillingPortalSession } from "@/serverFunctions/billing";
import {
  AUTO_RELOAD_CARD_FAILURE_REASONS,
  AUTO_RELOAD_MAX_MONTHLY_USD,
  BILLING_ROUTE,
} from "@/shared/billing";

type AutoReload = NonNullable<
  ReturnType<typeof useCreditBalance>["autoReload"]
>;
type AutoReloadState = ReturnType<typeof useCreditBalance>["autoReloadState"];

// What the one-click raise adds once the cycle's budget is spent.
const BUDGET_RAISE_STEP_USD = 50;

// Why a reload did not go through, in the customer's terms, for the reasons
// in AUTO_RELOAD_CARD_FAILURE_REASONS. Anything else is ours and gets support.
const CARD_FAILURES: Record<string, string> = {
  charge_failed: "tu tarjeta ha sido rechazada",
  suspended_after_failures: "tu tarjeta se ha rechazado varias veces",
  missing_payment_method: "no hay ninguna tarjeta guardada",
  payment_method_not_supported:
    "no se pueden hacer cargos automáticos a tu método de pago",
  payment_method_delayed: "tu método de pago tarda demasiado en confirmarse",
};

function formatDate(epochMs: number) {
  return new Date(epochMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** The last failed reload, or the cycle's budget being spent. */
export function AutoReloadNotice({
  saved,
  state,
  canRetry,
  resetDate,
  onRaise,
  pending,
}: {
  saved: AutoReload;
  state: AutoReloadState;
  /** Whether saving below charges the card again, which is the retry. */
  canRetry: boolean;
  resetDate: string | null;
  /** Saves a higher budget at once; absent when saving would charge the card. */
  onRaise: ((monthlyLimitUsd: number) => void) | undefined;
  pending: boolean;
}) {
  // A failure is news while reloads are expected; off, it is history.
  if (saved.enabled && saved.failure) {
    const isCardFailure = AUTO_RELOAD_CARD_FAILURE_REASONS.has(
      saved.failure.reason,
    );
    return (
      <Alert variant="destructive">
        <AlertDescription className="space-y-2">
          <p>
            {isCardFailure ? (
              <>
                La recarga automática falló el {formatDate(saved.failure.at)}:{" "}
                {CARD_FAILURES[saved.failure.reason] ?? "el cargo ha fallado"}.{" "}
                {canRetry
                  ? "Actualiza tu tarjeta y vuelve a intentarlo."
                  : "Actualiza tu tarjeta para que funcione la próxima vez que te quedes sin saldo."}
              </>
            ) : (
              <>
                La recarga automática no funciona ahora mismo. Compra créditos
                arriba y escribe a {SUPPORT_EMAIL}.
              </>
            )}
          </p>
          {isCardFailure ? <UpdateCardButton /> : null}
        </AlertDescription>
      </Alert>
    );
  }
  if (state === "budget_spent") {
    const raised = Math.min(
      saved.monthlyLimitUsd + BUDGET_RAISE_STEP_USD,
      AUTO_RELOAD_MAX_MONTHLY_USD,
    );
    // At the maximum there is nothing to raise; the reset is the way out.
    const canRaise = raised > saved.monthlyLimitUsd;
    return (
      <Alert variant="warning">
        <AlertDescription className="space-y-2">
          <p>
            Has alcanzado tu presupuesto mensual de ${saved.monthlyLimitUsd},
            así que las recargas de créditos están en pausa
            {resetDate ? ` hasta el ${resetDate}` : ""}.
            {canRaise ? " Súbelo para seguir." : ""}
          </p>
          {onRaise && canRaise ? (
            <Button
              variant="outline"
              size="sm"
              pending={pending}
              disabled={pending}
              onClick={() => onRaise(raised)}
            >
              Subir el presupuesto a ${raised}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

/** Opens the Stripe billing portal, where the card on file is changed. */
export function UpdateCardButton() {
  const [isOpening, setIsOpening] = useState(false);

  async function openPortal() {
    setIsOpening(true);
    try {
      window.location.assign(
        await createBillingPortalSession({ data: { returnTo: BILLING_ROUTE } }),
      );
    } catch (error) {
      setIsOpening(false);
      toast.error(
        getStandardErrorMessage(
          error,
          "No hemos podido abrir el portal de facturación. Vuelve a intentarlo.",
        ),
      );
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      pending={isOpening}
      onClick={() => void openPortal()}
    >
      {isOpening ? "Abriendo Stripe..." : "Actualizar tarjeta"}
    </Button>
  );
}

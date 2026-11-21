import { useEffect, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { ErrorState } from "@/client/components/ErrorState";
import { Button } from "@/client/components/ui/button";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { billingAccountQueryOptions } from "@/client/features/billing/billingAccountQuery";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { queryClient } from "@/client/tanstack-db";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

/**
 * An out-of-credits failure that says how to get more: a free plan upgrades,
 * a paid plan buys credits, and until the customer loads the generic copy
 * points at Billing. A retry can't fix it, so there is no retry button.
 *
 * The member role is left to the banner and the billing page: reading it here
 * would pull a server function into every page error (and every test that
 * renders one).
 */
export function InsufficientCreditsError({
  variant,
  title,
}: {
  variant?: "inline" | "card" | "page";
  title?: string;
}) {
  const { message, action } = useCreditsOffer("card");
  return (
    <ErrorState
      variant={variant}
      title={title}
      message={message}
      action={action}
    />
  );
}

/** The card's button alone, for a spot too small for the card. */
export function GetCreditsButton() {
  return useCreditsOffer("button").action;
}

function useCreditsOffer(surface: "card" | "button") {
  const {
    accountQuery,
    isFreePlan,
    isOutOfCredits,
    refillDate,
    autoReload,
    autoReloadState,
  } = useCreditBalance();

  useEffect(() => {
    captureClientEvent("billing:out_of_credits_shown", { surface });
  }, [surface]);

  // The balance the page shows is up to a minute old; a fresh refusal means
  // it moved, and with auto-reload on it is about to move again. The button
  // alone sits on stored skip reasons, one per row, which say nothing new.
  useEffect(() => {
    if (surface !== "card") return;
    void queryClient.invalidateQueries({
      queryKey: billingAccountQueryOptions().queryKey,
    });
  }, [surface]);

  let message: string;
  let action: ReactElement;
  if (!accountQuery.data) {
    message = getStandardErrorMessage(new Error("INSUFFICIENT_CREDITS"));
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Ir a Facturación"
      />
    );
  } else if (isFreePlan) {
    message = `No tienes créditos suficientes para esto. Mejora tu plan para tener $${BASE_PLAN_OFFER.monthlyCreditsUsd} en créditos cada mes.`;
    action = (
      <CreditsButton
        link={<Link to={SUBSCRIBE_ROUTE} search={{ upgrade: true }} />}
        label="Mejorar plan"
      />
    );
  } else if (autoReloadState === "on" && isOutOfCredits && autoReload) {
    // The refused call is what told Autumn to reload; the credits are coming.
    // A balance that is not out means this is an old refusal (a scheduled
    // run's stored skip reason), so it gets the general copy below.
    message = `Te has quedado sin créditos. La recarga automática está añadiendo $${autoReload.amountUsd} ahora, así que vuelve a intentarlo en un momento.`;
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Ir a Facturación"
      />
    );
  } else if (autoReloadState === "card_failed") {
    message =
      "Te has quedado sin créditos y la recarga automática no ha podido cobrar en tu tarjeta. Actualiza tu tarjeta para seguir.";
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Actualizar tarjeta"
      />
    );
  } else if (autoReloadState === "failed") {
    message =
      "Te has quedado sin créditos y la recarga automática no ha podido comprar más. Compra créditos para seguir.";
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Comprar créditos"
      />
    );
  } else if (autoReloadState === "budget_spent" && autoReload) {
    // Buying credits would not help: the budget counts those too.
    message = `Has alcanzado tu presupuesto mensual de recarga automática de $${autoReload.monthlyLimitUsd}, así que los créditos están en pausa${refillDate ? ` hasta el ${refillDate}` : ""}. Súbelo para seguir.`;
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Subir presupuesto"
      />
    );
  } else {
    message = refillDate
      ? `No tienes créditos suficientes para esto. Compra más o espera a la recarga mensual del ${refillDate}. La recarga automática puede comprarlos por ti la próxima vez.`
      : "No tienes créditos suficientes para esto. Compra más para seguir. La recarga automática puede comprarlos por ti la próxima vez.";
    action = (
      <CreditsButton
        link={<Link to={BILLING_ROUTE} />}
        label="Comprar créditos"
      />
    );
  }

  return { message, action };
}

function CreditsButton({ link, label }: { link: ReactElement; label: string }) {
  return (
    // Its own text color: a red error around it would otherwise tint it.
    <Button
      variant="outline"
      size="sm"
      className="text-foreground"
      nativeButton={false}
      render={link}
    >
      {label}
    </Button>
  );
}

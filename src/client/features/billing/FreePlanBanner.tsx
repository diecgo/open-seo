import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AppBanner } from "@/client/layout/AppBanner";
import { BASE_PLAN_OFFER } from "@/client/features/billing/plan-offers";
import { useCreditBalance } from "@/client/features/billing/useCreditBalance";
import { captureClientEvent } from "@/client/lib/posthog";
import { useCanManageBilling } from "@/client/features/team/organizationQueries";
import { BILLING_ROUTE, SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanBanner() {
  const {
    accountQuery,
    isFreePlan,
    isOutOfCredits,
    isLowCredits,
    refillDate,
    autoReload,
    autoReloadState,
    isPausedByBudget,
  } = useCreditBalance();
  const canManageBilling = useCanManageBilling();
  const showsOutOfCredits = Boolean(accountQuery.data) && isOutOfCredits;

  useEffect(() => {
    if (showsOutOfCredits)
      captureClientEvent("billing:out_of_credits_shown", { surface: "banner" });
  }, [showsOutOfCredits]);

  if (!accountQuery.data) {
    return null;
  }

  // Credits may be in the balance, but the budget holds them back; buying
  // more would not help, only raising it does.
  if (isPausedByBudget && autoReload) {
    const until = refillDate ? ` hasta el ${refillDate}` : "";
    return (
      <AppBanner variant="warning">
        {canManageBilling ? (
          <>
            Has alcanzado tu presupuesto mensual de recarga automática de $
            {autoReload.monthlyLimitUsd}, así que los créditos están en pausa
            {until}.{" "}
            <Link
              to={BILLING_ROUTE}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sube tu presupuesto
            </Link>{" "}
            para seguir.
          </>
        ) : (
          <>
            Tu organización ha alcanzado su presupuesto mensual de recarga
            automática, así que los créditos están en pausa{until}. Pide al
            propietario que lo suba.
          </>
        )}
      </AppBanner>
    );
  }

  // Out of credits with auto-reload on and working means Autumn is charging
  // the card right now; a "buy more" notice would have them pay twice.
  if (!isFreePlan && isOutOfCredits && autoReloadState === "on" && autoReload) {
    return (
      <AppBanner variant="info">
        Te has quedado sin créditos. La recarga automática está añadiendo $
        {autoReload.amountUsd} ahora.
      </AppBanner>
    );
  }

  // Only the owner can change the plan or buy credits, so a link would lead
  // everyone else to a page where they can't act.
  if (!canManageBilling && (isOutOfCredits || isLowCredits)) {
    return (
      <AppBanner variant={isOutOfCredits ? "destructive" : "warning"}>
        {isOutOfCredits
          ? autoReloadState === "card_failed"
            ? "Tu organización se ha quedado sin créditos y su tarjeta ha sido rechazada."
            : "Tu organización ha gastado sus créditos."
          : "A tu organización le quedan pocos créditos."}{" "}
        Pide al propietario de tu organización que{" "}
        {autoReloadState === "card_failed" ? "la actualice" : "añada más"}.
      </AppBanner>
    );
  }

  const creditsActionLink = isFreePlan ? (
    <Link
      to={SUBSCRIBE_ROUTE}
      search={{ upgrade: true }}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Mejora tu plan
    </Link>
  ) : (
    <Link
      to={BILLING_ROUTE}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Compra más créditos
    </Link>
  );

  if (isOutOfCredits) {
    return (
      <AppBanner variant="destructive">
        {isFreePlan ? (
          <>
            Has gastado tus créditos gratuitos. {creditsActionLink} para tener $
            {BASE_PLAN_OFFER.monthlyCreditsUsd} en créditos cada mes.
          </>
        ) : autoReloadState === "card_failed" ? (
          <>
            Te has quedado sin créditos y la recarga automática no ha podido
            cobrar en tu tarjeta.{" "}
            <Link
              to={BILLING_ROUTE}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Actualiza tu tarjeta
            </Link>{" "}
            para seguir.
          </>
        ) : autoReloadState === "failed" ? (
          <>
            Te has quedado sin créditos y la recarga automática no ha podido
            comprar más. {creditsActionLink} para seguir.
          </>
        ) : (
          <>
            Has gastado los créditos de este mes. {creditsActionLink} para
            seguir
            {refillDate ? ` o espera a que se recarguen el ${refillDate}` : ""}.
          </>
        )}
      </AppBanner>
    );
  }

  if (isLowCredits) {
    return (
      <AppBanner variant="warning">
        Te quedan pocos créditos. {creditsActionLink} para seguir usando
        OpenSEO.
      </AppBanner>
    );
  }

  if (isFreePlan) {
    return (
      <AppBanner variant="info">
        ¡Esperamos que estés disfrutando de OpenSEO!{" "}
        <Link
          to={SUBSCRIBE_ROUTE}
          search={{ upgrade: true }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Mejora tu plan cuando quieras
        </Link>{" "}
        o{" "}
        <Link
          to="/support"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          escríbenos si tienes dudas
        </Link>
        .
      </AppBanner>
    );
  }

  return null;
}

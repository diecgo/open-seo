import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { useQuery } from "@tanstack/react-query";
import {
  organizationContextQueryOptions,
  useCanManageBilling,
} from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientError, captureClientEvent } from "@/client/lib/posthog";
import {
  billingAccountQueryOptions,
  prefetchBillingAccount,
} from "@/client/features/billing/billingAccountQuery";
import { createBillingPortalSession } from "@/serverFunctions/billing";
import { BILLING_ROUTE } from "@/shared/billing";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPage } from "@/client/components/SkeletonPresets";
import { Spinner } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";
import { pageHead } from "@/client/lib/pageHead";

const SUPPORT_EMAIL = "support@openseo.so";

// How long the post-portal "checking" screen polls Autumn before telling the
// user the retry is still pending, and how often it polls.
const CHECKING_TIMEOUT_MS = 30_000;
const CHECKING_POLL_MS = 1000;

// Linked from the payment-failed email. Deliberately narrower than /billing:
// one problem, one fix. The Stripe portal both saves the new card as the
// default and lets the customer pay the open invoice, so it is the only action.
export const Route = createFileRoute("/_app/billing_/fix-payment")({
  head: () => pageHead("Facturación"),
  // The loader fills the module-scoped query client, so keep it out of server
  // requests: one worker isolate must not cache another account's billing.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { returned?: true } => ({
    returned:
      search.returned === true || search.returned === "true" ? true : undefined,
  }),
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  // Most visits are full loads from the payment-failed email: start the
  // billing read alongside the session check, not after it.
  loader: () => prefetchBillingAccount(),
  component: FixPaymentPage,
});

function FixPaymentPage() {
  const { returned } = Route.useSearch();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingTimedOut, setCheckingTimedOut] = useState(false);
  const viewCaptured = useRef(false);

  const accountQuery = useQuery({
    ...billingAccountQueryOptions(),
    // Stripe retries the invoice with the new card and Autumn relays the
    // result a few seconds later; poll until the subscription is no longer
    // past due. An interval never cancels a read in flight, unlike refetch().
    refetchInterval: (query) =>
      returned && !checkingTimedOut && query.state.data?.isPastDue
        ? CHECKING_POLL_MS
        : false,
  });
  const account = accountQuery.data;

  const canManageBilling = useCanManageBilling();
  // The hook above reports true while the role loads (a UI choice); the
  // telemetry waits for the real role.
  const roleResolved =
    useQuery(organizationContextQueryOptions()).data !== undefined;

  const isLoaded = account !== undefined;
  const isPastDue = account?.isPastDue ?? false;
  const isChecking = Boolean(returned) && isPastDue && !checkingTimedOut;

  useEffect(() => {
    if (!isChecking) return;
    const timeout = setTimeout(() => {
      setCheckingTimedOut(true);
      // The user did the right thing and we could not confirm it worked.
      // Rare enough that every occurrence is worth a look.
      captureClientError(
        new Error("Subscription still past due after billing portal return"),
        { context: "fix_payment_check_timeout" },
      );
    }, CHECKING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isChecking]);

  // Funnel: viewed -> portal_opened -> returned -> payment_fixed. Each fires
  // once per page load; `returned` is a full navigation back from Stripe.
  useEffect(() => {
    if (!isLoaded || !roleResolved || viewCaptured.current) return;
    viewCaptured.current = true;
    captureClientEvent(
      returned ? "billing:fix_payment_returned" : "billing:fix_payment_viewed",
      { past_due: isPastDue, can_manage_billing: canManageBilling },
    );
  }, [isLoaded, roleResolved, returned, isPastDue, canManageBilling]);

  useEffect(() => {
    if (returned && isLoaded && !isPastDue) {
      captureClientEvent("billing:payment_fixed");
    }
  }, [returned, isLoaded, isPastDue]);

  async function openPortal() {
    setError(null);
    setIsOpeningPortal(true);
    captureClientEvent("billing:fix_payment_portal_opened");
    try {
      window.location.assign(
        await createBillingPortalSession({
          data: { returnTo: "/billing/fix-payment?returned=true" },
        }),
      );
    } catch (err) {
      captureClientError(err, { context: "fix_payment_open_portal" });
      setError(
        getStandardErrorMessage(
          err,
          "No hemos podido abrir el portal de facturación. Inténtalo de nuevo.",
        ),
      );
      setIsOpeningPortal(false);
    }
  }

  if (accountQuery.isPending) {
    return <SkeletonPage />;
  }

  // A failed refetch keeps the loaded page; only a failed first read stops.
  if (!isLoaded) {
    return (
      <Page title="Facturación no disponible">
        <QueryError
          cause={accountQuery.error}
          fallback="No hemos podido cargar tus datos de facturación. Inténtalo de nuevo."
          onRetry={() => void accountQuery.refetch()}
          isRetrying={accountQuery.isFetching}
        />
      </Page>
    );
  }

  if (isChecking) {
    return (
      <Page title="Comprobando tu pago…">
        <Spinner />
        <p className="text-sm text-muted-foreground">
          Stripe está reintentando el cobro con tu tarjeta actualizada. Suele
          tardar unos segundos.
        </p>
      </Page>
    );
  }

  if (!isPastDue) {
    return (
      <Page title={returned ? "Todo listo" : "Tu facturación está al día"}>
        <p className="text-sm text-muted-foreground">
          {returned
            ? "El pago se ha completado y tu suscripción vuelve a estar activa."
            : "No tienes nada pendiente en tu cuenta."}{" "}
          <Link
            to={BILLING_ROUTE}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Volver a facturación
          </Link>
        </p>
      </Page>
    );
  }

  if (!canManageBilling) {
    return (
      <Page title="Soluciona tu pago">
        <p className="text-sm text-muted-foreground">
          Un pago de esta organización no se ha completado. Solo el propietario
          de la organización puede actualizar la tarjeta, así que pídele que
          entre en esta página.
        </p>
      </Page>
    );
  }

  return (
    <Page
      title={returned ? "Sigue apareciendo como impagado" : "Soluciona tu pago"}
    >
      <p className="text-sm text-muted-foreground">
        {returned
          ? "Tu suscripción sigue marcada como vencida. Stripe puede tardar unos minutos en reintentar el cobro. Si has añadido una tarjeta nueva pero la factura sigue abierta en el portal, puedes pagarla allí directamente."
          : "Tu último pago no se ha completado. Suele pasar porque la tarjeta ha caducado o el banco ha rechazado el cobro. Todavía no se ha desactivado nada."}
      </p>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold">Actualiza tu método de pago</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Añade una tarjeta válida en el portal de facturación. Será la
          predeterminada para las próximas renovaciones y podrás pagar la
          factura abierta en la misma pantalla.
        </p>
        <Button
          size="sm"
          className="mt-3"
          pending={isOpeningPortal}
          onClick={() => void openPortal()}
        >
          {isOpeningPortal ? "Abriendo Stripe…" : "Abrir portal de facturación"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Page>
  );
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto box-content max-w-7xl space-y-5 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Facturación</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">
        ¿Algo no cuadra? Escribe a {SUPPORT_EMAIL}.
      </p>
    </div>
  );
}

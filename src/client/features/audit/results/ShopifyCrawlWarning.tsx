import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  CrawlerAccessForm,
  CrawlerAccessSetupHint,
  useCrawlerAccessNeedsSetup,
  crawlerCredentialsQueryKey,
  saveCrawlerCredentialMutationKey,
} from "@/client/features/crawler-access/CrawlerAccessForm";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { ShopifyRateLimitAlert } from "@/client/features/audit/results/ShopifyRateLimitAlert";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { extractHostname } from "@/client/features/audit/shared";
import { startAudit } from "@/serverFunctions/audit";
import { listCrawlerCredentials } from "@/serverFunctions/crawlerAccess";
import {
  SHOPIFY_CRAWLER_ACCESS_DOC_URL,
  isCrawlerAccessExpired,
} from "@/shared/crawler-access";

/**
 * Shown instead of the generic crawl warnings when a Shopify storefront
 * throttled or refused the crawl. Shopify's own fix is a crawler-access
 * signature the merchant creates in admin, so the report asks for it first.
 *
 * The setup steps only show while the domain has no usable signature. Once
 * one is saved they collapse to a single line with the re-run button. An
 * unrendered crawl Shopify still rate limited with the signature asks for
 * rendering instead. Where CRAWLER_ACCESS_SECRET is optional (Every App and
 * self-hosts), the warning says to set it first when it isn't: a signature
 * created too early only runs down its expiry.
 */
export function ShopifyCrawlWarning({
  projectId,
  audit,
  throttled,
}: {
  projectId: string;
  audit: AuditResultsData["audit"];
  /** Shopify answered with 429s, not only refusals. */
  throttled: boolean;
}) {
  const navigate = useNavigate();
  const host = extractHostname(audit.startUrl);
  const usedCredentialId = audit.config.crawlerCredentialId;

  const credentialsQuery = useQuery({
    queryKey: crawlerCredentialsQueryKey,
    queryFn: () => listCrawlerCredentials(),
  });
  const canStoreCrawlerAccess = !useCrawlerAccessNeedsSetup(projectId);
  const setupHint = canStoreCrawlerAccess ? null : (
    <p className="text-muted-foreground">
      No se puede guardar una firma aquí hasta que configures el acceso del
      rastreador web. <CrawlerAccessSetupHint />
    </p>
  );
  // A recorded credential id names the signature this crawl used, whatever
  // else is stored for the host on another project. If that one has expired
  // since (possibly mid-crawl), expiry is the explanation. Without a recorded
  // id, an expired row for the host is why the crawl went out unsigned.
  const expiredCredential = credentialsQuery.data?.find(
    (credential) =>
      (usedCredentialId
        ? credential.id === usedCredentialId
        : credential.host === host) &&
      isCrawlerAccessExpired(credential.expiresAt),
  );
  // Several projects can hold a live signature for this host; the one this
  // crawl used decides whether the crawl was signed.
  const liveCredentials = (credentialsQuery.data ?? []).filter(
    (credential) =>
      credential.host === host && !isCrawlerAccessExpired(credential.expiresAt),
  );
  const liveCredential =
    liveCredentials.find((credential) => credential.id === usedCredentialId) ??
    liveCredentials[0];
  // A re-run started mid-save would resolve the old signature, or none.
  const isSaving =
    useIsMutating({ mutationKey: saveCrawlerCredentialMutationKey }) > 0;

  const rerunMutation = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: audit.startUrl,
          maxPages: audit.config.maxPages,
          lighthouseStrategy: audit.config.lighthouseStrategy,
          renderJavaScript: audit.config.renderJavaScript,
          excludePaths: audit.config.excludePaths,
        },
      }),
    onSuccess: (result) => {
      void navigate({
        to: "/p/$projectId/audit",
        params: { projectId },
        search: { auditId: result.auditId, tab: "issues" },
      });
    },
  });

  const rerunButton = (
    <Button
      variant="outline"
      size="sm"
      pending={rerunMutation.isPending}
      disabled={isSaving}
      onClick={() => rerunMutation.mutate()}
    >
      {rerunMutation.isPending ? "Iniciando…" : "Relanzar auditoría"}
    </Button>
  );

  // Until the list loads we can't tell which state applies; don't flash the
  // setup steps at someone who already has a signature.
  if (credentialsQuery.isPending) return null;

  if (liveCredential) {
    const signedAndStillLimited = liveCredential.id === usedCredentialId;
    if (signedAndStillLimited && throttled && !audit.config.renderJavaScript) {
      return (
        <ShopifyRateLimitAlert
          projectId={projectId}
          startUrl={audit.startUrl}
        />
      );
    }
    return (
      <Alert variant={signedAndStillLimited ? "warning" : "success"}>
        {signedAndStillLimited ? <ShieldAlert /> : <ShieldCheck />}
        <AlertDescription className="text-foreground">
          {signedAndStillLimited ? (
            <>
              Shopify ha limitado este rastreo pese a tu firma. Para comprobar
              que se creó para <span className="font-mono">{host}</span>, vuelve
              a pegarla en{" "}
              <Link
                to="/p/$projectId/settings/integrations"
                params={{ projectId }}
              >
                Ajustes del proyecto
              </Link>
              . Si es así, Shopify sigue limitando esta tienda: vuelve a lanzar
              la auditoría más tarde o con menos páginas.
            </>
          ) : (
            <>
              El acceso del rastreador web está guardado para{" "}
              <span className="font-mono">{host}</span>. Vuelve a lanzar la
              auditoría para rastrear con él.
            </>
          )}
        </AlertDescription>
        <div className="col-start-2 mt-2">{rerunButton}</div>
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <ShieldAlert />
      <div className="min-w-0 space-y-3">
        {expiredCredential?.expiresAt ? (
          <>
            <AlertTitle>
              Tu firma de Shopify para esta tienda ha caducado.
            </AlertTitle>
            {setupHint}
            <p className="text-muted-foreground">
              Caducó el{" "}
              {new Date(expiredCredential.expiresAt).toLocaleDateString()}, así
              que las peticiones posteriores salieron sin firmar y Shopify las
              limitó.
              {canStoreCrawlerAccess
                ? " Las firmas no se pueden renovar: crea una nueva en el admin de Shopify y pégala abajo para sustituir los valores guardados."
                : null}
            </p>
          </>
        ) : (
          <>
            <AlertTitle>Shopify ha limitado este rastreo.</AlertTitle>
            {setupHint}
            <p className="text-muted-foreground">
              Shopify limita la frecuencia de los rastreadores que no ha
              autorizado, así que faltan partes de este informe.
              {canStoreCrawlerAccess
                ? " Si esta tienda es tuya, autorizar a OpenSEO lleva un minuto."
                : null}
            </p>
          </>
        )}

        {canStoreCrawlerAccess ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                En el admin de Shopify, ve a Tienda online &rarr; Preferencias
                &rarr; Crawler access y haz clic en Create signature.
              </li>
              <li>
                Elige el dominio <span className="font-mono">{host}</span> y una
                caducidad (hasta 3 meses).
              </li>
              <li>Pega los dos valores abajo.</li>
            </ol>

            {/* Keyed by host: the report stays mounted when the audit changes. */}
            <CrawlerAccessForm
              key={host}
              projectId={projectId}
              initialHost={host}
              lockHost
            />
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          {rerunButton}
          <a
            className="text-primary underline underline-offset-3"
            href={SHOPIFY_CRAWLER_ACCESS_DOC_URL}
            target="_blank"
            rel="noreferrer"
          >
            Guía de acceso de rastreadores de Shopify
          </a>
        </div>
      </div>
    </Alert>
  );
}

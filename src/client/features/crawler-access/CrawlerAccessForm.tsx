import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { useAuditCapabilities } from "@/client/features/audit/shared";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { saveCrawlerCredential } from "@/serverFunctions/crawlerAccess";
import {
  isCrawlerAccessExpired,
  parseSignatureExpiry,
} from "@/shared/crawler-access";

export const crawlerCredentialsQueryKey = ["crawler-credentials"];
export const saveCrawlerCredentialMutationKey = ["save-crawler-credential"];

/**
 * CRAWLER_ACCESS_SECRET is optional on Every App and on self-hosts, so the form
 * and the Shopify crawl warning say how to set it instead of failing on save.
 */
export function CrawlerAccessSetupHint() {
  if (isEveryAppClientAuthMode()) {
    return (
      <>
        Un administrador configura <code>CRAWLER_ACCESS_SECRET</code> con{" "}
        <code>
          pnpm everyapp secret set CRAWLER_ACCESS_SECRET --app openseo
        </code>
        .
      </>
    );
  }
  return (
    <>
      Un administrador configura <code>CRAWLER_ACCESS_SECRET</code> con al menos
      32 caracteres aleatorios en el entorno de la instalación y vuelve a
      desplegar.
    </>
  );
}

/** Whether to show the setup hint, once the server has said. */
export function useCrawlerAccessNeedsSetup(projectId: string) {
  return useAuditCapabilities(projectId).data?.canStoreCrawlerAccess === false;
}

const signatureSchema = z.object({
  host: z.string().trim().min(1, "Introduce un dominio."),
  signatureInput: z
    .string()
    .trim()
    .min(1, "Introduce Signature-Input.")
    .refine(
      (value) => !isCrawlerAccessExpired(parseSignatureExpiry(value)),
      "Esta firma ya ha caducado. Crea una nueva en el admin de Shopify.",
    ),
  signature: z.string().trim().min(1, "Introduce Signature."),
});

/**
 * The two values a merchant copies out of Shopify admin. `Signature-Agent` is
 * a constant we add ourselves, so it is not asked for here.
 */
export function CrawlerAccessForm({
  projectId,
  initialHost,
  lockHost = false,
  onSaved,
}: {
  /** The project (website) the signature is stored on. */
  projectId: string;
  initialHost: string;
  lockHost?: boolean;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationKey: saveCrawlerCredentialMutationKey,
    mutationFn: (values: z.infer<typeof signatureSchema>) =>
      saveCrawlerCredential({
        data: { projectId, ...values },
      }),
    onSuccess: async (result) => {
      if ("problem" in result) return;
      await queryClient.invalidateQueries({
        queryKey: crawlerCredentialsQueryKey,
      });
      toast.success(
        `Acceso del rastreador web guardado para ${result.credential.host}`,
      );
      onSaved?.();
    },
  });

  const form = useAppForm({
    defaultValues: { host: initialHost, signatureInput: "", signature: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signatureSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await saveMutation.mutateAsync(value);
      if ("problem" in result) {
        const { problem } = result;
        formApi.setErrorMap({
          onSubmit: {
            fields: {
              signatureInput:
                problem.reason === "wrong_domain"
                  ? `Esta firma se creó para ${problem.signedHost}, no para ${problem.host}. En el admin de Shopify, crea una firma para ${problem.host}.`
                  : `Shopify no acepta esta firma para ${problem.host}. Comprueba que la creaste para ${problem.host} y que copiaste los dos valores completos.`,
            },
          },
        });
        return;
      }
      formApi.reset({ ...value, signatureInput: "", signature: "" });
    },
  });

  if (useCrawlerAccessNeedsSetup(projectId)) {
    return (
      <p className="text-sm text-muted-foreground">
        Crawler access isn't set up yet. <CrawlerAccessSetupHint />
      </p>
    );
  }

  return (
    <form.AppForm>
      <form.Form className="space-y-3">
        {!lockHost ? (
          <form.AppField name="host">
            {(field) => (
              <field.TextField
                label="Dominio"
                placeholder="store.example.com"
                className="font-mono"
                required
              />
            )}
          </form.AppField>
        ) : null}
        <form.AppField name="signatureInput">
          {(field) => (
            <field.TextField
              label="Signature-Input"
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=(...);expires=..."
              required
            />
          )}
        </form.AppField>
        <form.AppField name="signature">
          {(field) => (
            <field.TextField
              label="Signature"
              description="Shopify también muestra un valor Signature-Agent. No hace falta que lo pegues: OpenSEO lo envía en cada petición."
              type="password"
              autoComplete="off"
              data-ph-mask
              className="font-mono"
              placeholder="sig1=:...:"
              required
            />
          )}
        </form.AppField>
        <form.SubmitButton disabled={!projectId}>
          Guardar firma
        </form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}

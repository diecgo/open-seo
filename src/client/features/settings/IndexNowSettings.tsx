import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ChevronRight, CircleCheck, CircleX, Download } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { CardShell } from "@/client/components/CardShell";
import { QueryError } from "@/client/components/QueryState";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { CopyButton } from "@/client/components/CopyButton";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import {
  checkIndexNowKeyFiles,
  getIndexNowSetup,
  setUpIndexNow,
  submitIndexNowUrls,
} from "@/serverFunctions/indexnow";

const urlsSchema = z.object({
  urls: z
    .string()
    .refine(
      (value) => splitUrls(value).length > 0,
      "Introduce al menos una URL.",
    ),
});

function splitUrls(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const AGENT_PROMPT = "Envía a IndexNow las páginas que acabo de publicar.";

type KeyFileHost = Awaited<
  ReturnType<typeof checkIndexNowKeyFiles>
>["hosts"][number];

const KEY_FILE_LABELS: Record<KeyFileHost["status"], string> = {
  found: "Encontrado",
  missing: "No encontrado",
  wrong_content: "Solo debe contener la clave",
  redirects: "Redirige. El archivo tiene que cargarse en esta misma dirección",
  moved: "Redirige a otra dirección",
  unreachable: "No se ha podido acceder a esta dirección",
  unknown: "Ahora mismo no se puede comprobar",
};

// A host that forwards to another one or doesn't load has no pages to
// submit, so it doesn't need the file.
const isUnused = (host: KeyFileHost) =>
  host.status === "moved" || host.status === "unreachable";

const pluralUrls = (count: number) => `${count} URL`;

function downloadKeyFile(key: string) {
  const url = URL.createObjectURL(new Blob([key], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${key}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * IndexNow tells Bing and the other participating engines which pages
 * changed. The site proves ownership by hosting the project's key file.
 */
export function IndexNowSettings({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const setupQueryKey = ["indexnow-setup", projectId];
  const setupQuery = useQuery({
    queryKey: setupQueryKey,
    queryFn: () => getIndexNowSetup({ data: { projectId } }),
    // Website edits elsewhere don't invalidate this, so refetch on each visit.
    staleTime: 0,
  });

  const setUpMutation = useMutation({
    mutationFn: () => setUpIndexNow({ data: { projectId } }),
    onSuccess: (setup) => queryClient.setQueryData(setupQueryKey, setup),
  });

  const keyFilesQueryKey = ["indexnow-key-files", projectId];
  const hasKey = Boolean(setupQuery.data?.domain && setupQuery.data.key);
  const keyFilesQuery = useQuery({
    queryKey: keyFilesQueryKey,
    queryFn: () => checkIndexNowKeyFiles({ data: { projectId } }),
    enabled: hasKey,
  });

  const submitMutation = useMutation({
    mutationFn: (urls: string[]) =>
      submitIndexNowUrls({ data: { projectId, urls } }),
  });

  const form = useAppForm({
    defaultValues: { urls: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: urlsSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await submitMutation.mutateAsync(splitUrls(value.urls));
      const failed = result.hosts.filter((host) => host.status === "failed");
      const sent = result.hosts
        .filter((host) => host.status === "submitted")
        .reduce((count, host) => count + host.urlCount, 0);

      for (const host of failed) {
        toast.error("No se ha podido enviar a IndexNow", {
          description: host.message,
          duration: 10_000,
        });
      }
      if (sent > 0) toast.success(`${pluralUrls(sent)} enviadas`);
      if (result.skipped.length > 0) {
        toast.warning(
          `${pluralUrls(result.skipped.length)} omitidas por no estar en ${setupQuery.data?.domain}`,
        );
      }
      if (failed.length > 0) {
        void queryClient.invalidateQueries({ queryKey: keyFilesQueryKey });
      }
      if (failed.length === 0 && sent > 0) formApi.reset();
    },
  });

  if (setupQuery.isError) {
    return (
      <section id="indexnow" className="scroll-mt-6">
        <CardShell title="IndexNow">
          <QueryError
            error={setupQuery.error}
            fallback="No se ha podido cargar IndexNow."
            onRetry={() => void setupQuery.refetch()}
            isRetrying={setupQuery.isFetching}
          />
        </CardShell>
      </section>
    );
  }
  if (!setupQuery.data) return null;
  const { domain, key } = setupQuery.data;

  return (
    <section id="indexnow" className="scroll-mt-6">
      <CardShell title="IndexNow">
        <div className="flex flex-1 flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            Avisa a Bing de las páginas nuevas y actualizadas en cuanto las
            publiques, en vez de esperar a que rastree tu web. Bing también
            alimenta los resultados de DuckDuckGo y Yahoo. Google no usa
            IndexNow.
          </p>
          {!domain ? (
            <p className="text-muted-foreground">
              Añade tu web en los ajustes generales para usar IndexNow.
            </p>
          ) : !key ? (
            <div className="mt-auto flex justify-end">
              <Button
                variant="outline"
                size="sm"
                pending={setUpMutation.isPending}
                onClick={() => setUpMutation.mutate()}
              >
                Configurar IndexNow
              </Button>
            </div>
          ) : (
            <ol className="space-y-5">
              <KeyFileStep
                domain={domain}
                indexNowKey={key}
                hosts={keyFilesQuery.data?.hosts}
                isChecking={keyFilesQuery.isFetching}
                onCheck={() => void keyFilesQuery.refetch()}
              />
              <Step
                number={2}
                title="Envía las páginas cuando las publiques o actualices"
              >
                <p className="text-muted-foreground">
                  Pega solo las páginas que han cambiado, no toda la web.
                </p>
                <form.AppForm>
                  <form.Form className="space-y-3">
                    <form.AppField name="urls">
                      {(field) => (
                        <field.TextareaField
                          label={
                            <span className="text-xs font-normal text-muted-foreground">
                              URL (una por línea)
                            </span>
                          }
                          placeholder={`https://${domain}/pagina-nueva`}
                          className="min-h-28 font-mono text-xs"
                        />
                      )}
                    </form.AppField>
                    <form.SubmitButton>Enviar a IndexNow</form.SubmitButton>
                  </form.Form>
                </form.AppForm>
                <div className="space-y-1 rounded-md bg-muted/50 p-3 text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      O pídeselo a tu agente:{" "}
                      <span className="text-foreground">"{AGENT_PROMPT}"</span>
                    </span>
                    <CopyButton
                      value={AGENT_PROMPT}
                      successMessage="Prompt copiado"
                      size="icon-xs"
                      variant="ghost"
                      label="Copiar prompt"
                    />
                  </div>
                  <p className="text-xs">
                    Si puede editar el código de tu web, también puede añadir el
                    archivo de clave.
                  </p>
                </div>
              </Step>
            </ol>
          )}
        </div>
      </CardShell>
    </section>
  );
}

function KeyFileStep({
  domain,
  indexNowKey,
  hosts,
  isChecking,
  onCheck,
}: {
  domain: string;
  indexNowKey: string;
  hosts: KeyFileHost[] | undefined;
  isChecking: boolean;
  onCheck: () => void;
}) {
  const used = hosts?.filter((host) => !isUnused(host)) ?? [];
  // Until the check answers, list both addresses without a status.
  const shown: { host: string; status?: KeyFileHost["status"] }[] = !hosts
    ? [{ host: domain }, { host: `www.${domain}` }]
    : used.length > 0
      ? used
      : hosts;
  const verified =
    used.length > 0 && used.every((host) => host.status === "found");

  return (
    <Step
      number={1}
      title={
        verified
          ? "Tu archivo de clave está configurado"
          : "Añade este archivo de clave a tu web"
      }
    >
      {verified ? null : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => downloadKeyFile(indexNowKey)}
          >
            <Download className="size-4" />
            Descargar archivo de clave
          </Button>
          <p className="text-muted-foreground">
            Ponlo en la raíz de tu web para que se abra en:
          </p>
        </>
      )}
      <ul className="space-y-1">
        {shown.map((host) => (
          <li
            key={host.host}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
          >
            <SafeExternalLink
              url={`https://${host.host}/${indexNowKey}.txt`}
              label={`https://${host.host}/${indexNowKey}.txt`}
              className="inline-flex items-center gap-1 font-mono text-xs break-all text-foreground underline underline-offset-2"
            />
            {host.status ? <KeyFileStatus status={host.status} /> : null}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="xs"
        className="w-fit"
        pending={isChecking}
        onClick={onCheck}
      >
        Volver a comprobar
      </Button>
      {verified ? null : (
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronRight
              className="size-3.5 transition-transform group-data-[panel-open]:rotate-90"
              aria-hidden
            />
            ¿Cómo añado un archivo a mi web?
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Web hecha con código: pon el archivo en la carpeta que tu web
                sirve tal cual, que suele llamarse <code>public</code> o{" "}
                <code>static</code>.
              </li>
              <li>
                WordPress: súbelo con el gestor de archivos de tu hosting o por
                SFTP a la carpeta que contiene <code>wp-config.php</code>.
                Plugins de SEO como Rank Math también pueden enviar a IndexNow
                por ti.
              </li>
              <li>
                En Cloudflare: activa Crawler Hints en los ajustes de caché de
                Cloudflare y enviará por ti las páginas modificadas a IndexNow.
              </li>
              <li>
                Los creadores de webs como Webflow, Shopify, Squarespace y Wix
                no suelen dejarte añadir archivos en la raíz. Comprueba si el
                tuyo ya es compatible con IndexNow.
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Step>
  );
}

function KeyFileStatus({ status }: { status: KeyFileHost["status"] }) {
  const problem =
    status === "missing" ||
    status === "wrong_content" ||
    status === "redirects";
  const Icon = status === "found" ? CircleCheck : problem ? CircleX : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${status === "found" ? "text-success" : problem ? "text-destructive" : "text-muted-foreground"}`}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {KEY_FILE_LABELS[status]}
    </span>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}

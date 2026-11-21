import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AiMentionIllustration } from "@/client/components/EmptyIllustrations";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { Textarea } from "@/client/components/ui/textarea";
import { InsufficientCreditsError } from "@/client/features/billing/InsufficientCreditsError";
import { getErrorCode } from "@/client/lib/error-messages";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { WebsiteResearchProgress } from "@/client/features/projects/WebsiteResearchProgress";
import { OpenRouterKeyGate } from "./OpenRouterKeyGate";
import { WebsiteSetupReview } from "@/client/features/projects/WebsiteSetupReview";
import { startAiResearchSetup } from "@/serverFunctions/ai-visibility";
import { updateProjectContext } from "@/serverFunctions/projectContext";
import { saveProjectWebsiteSetup } from "@/serverFunctions/projectWebsite";
import { PROSE_MAX_CHARS } from "@/types/schemas/projectContext";
import type { SaveProjectWebsiteSetup } from "@/types/schemas/projectWebsite";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import {
  AiQueryError,
  aiResearchKeywordsQueryOptions,
  aiResearchSetupQueryOptions,
  aiRunResultsQueryOptions,
  aiTrackerQueryOptions,
  aiVisibilityKey,
} from "./shared";

/**
 * AI visibility needs a tracker. A project with a website but none confirms
 * the spend here, then the server runs setup once: website research and the
 * onboarding competitor review when the overview or competitors are missing,
 * otherwise one keyword and prompt generation, reusing keywords already saved.
 * The run lives on the server, so leaving or reloading the page finds it
 * again. Both paths end on the page that started setup.
 */
export function AiResearchSetupGate({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const setupOptions = aiResearchSetupQueryOptions(projectId);
  const setup = useQuery(setupOptions);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: aiVisibilityKey(projectId) }),
      queryClient.invalidateQueries({
        queryKey: ["projectContext", projectId],
      }),
      queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      }),
    ]);
  const start = useMutation({
    mutationFn: () => startAiResearchSetup({ data: { projectId } }),
    onSuccess: (data) => queryClient.setQueryData(setupOptions.queryKey, data),
  });
  // A site we can't read, usually because of bot protection, leaves the
  // overview to the user. With one saved, setup no longer reads the site.
  const [overview, setOverview] = useState("");
  const saveOverview = useMutation({
    mutationFn: () =>
      updateProjectContext({
        data: {
          projectId,
          updates: [{ section: "business_overview", content: overview.trim() }],
        },
      }),
    onSuccess: () => {
      // Setup can still fail, so the saved overview mustn't wait for it.
      void queryClient.invalidateQueries({
        queryKey: ["projectContext", projectId],
      });
      start.mutate();
    },
  });
  // Setup writes the tracker, research keywords and a first run. Load what the
  // AI visibility pages read before setup reads ready, so the page that
  // started it doesn't flash what it cached before. A failed load drops that
  // cache instead, so the page loads it again with its own retry and error.
  const loadSetupResults = async () => {
    const tracker = aiTrackerQueryOptions(projectId);
    const keywords = aiResearchKeywordsQueryOptions(projectId);
    await Promise.all([
      queryClient.fetchQuery({ ...tracker, staleTime: 0 }).then(
        ({ recentRuns }) => {
          const runId = recentRuns[0]?.id;
          if (runId)
            return queryClient.prefetchQuery(
              aiRunResultsQueryOptions(projectId, runId),
            );
        },
        () => queryClient.removeQueries({ queryKey: tracker.queryKey }),
      ),
      queryClient
        .fetchQuery({ ...keywords, staleTime: 0 })
        .catch(() =>
          queryClient.removeQueries({ queryKey: keywords.queryKey }),
        ),
    ]);
    await refresh();
  };
  const save = useMutation({
    mutationFn: (accepted: Omit<SaveProjectWebsiteSetup, "projectId">) =>
      saveProjectWebsiteSetup({ data: { ...accepted, projectId } }),
    onSuccess: loadSetupResults,
  });
  const status = setup.data?.status;
  // Setup that finishes anywhere but this gate's save (a background run,
  // another tab) holds the progress screen until the results load, as a saved
  // review keeps its saving state.
  const [lastStatus, setLastStatus] = useState(status);
  const [finishing, setFinishing] = useState(false);
  if (status !== lastStatus) {
    setLastStatus(status);
    const done = lastStatus && lastStatus !== "ready" && status === "ready";
    if (done && !save.isPending) setFinishing(true);
  }
  useEffect(() => {
    if (finishing) void loadSetupResults().finally(() => setFinishing(false));
    // loadSetupResults only reads projectId, which keys this gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishing]);
  if (setup.isPending) return <SkeletonPageContent />;
  if (setup.isError)
    return (
      <AiQueryError
        error={setup.error}
        retry={() => {
          void setup.refetch();
        }}
      />
    );
  if (status === "ready" && !finishing) return children;
  const data = setup.data;
  // Saved results open without an OpenRouter key; only setup needs one.
  return (
    <OpenRouterKeyGate projectId={projectId}>{renderSetup()}</OpenRouterKeyGate>
  );

  function renderSetup() {
    if (data.review)
      return (
        <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
          <WebsiteSetupReview
            projectId={projectId}
            research={data.review}
            saving={save.isPending}
            error={save.isError}
            onSave={(accepted) => save.mutate(accepted)}
          />
        </div>
      );
    if (status === "running" || start.isPending || finishing)
      return (
        <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
          <WebsiteResearchProgress
            missingOverview={data.missingOverview}
            missingCompetitors={data.missingCompetitors}
            note="Puedes salir de esta página; la configuración sigue en marcha."
          />
        </div>
      );
    const failed = status === "failed" || start.isError;
    const unreadable = !start.isError && data.failure === "website_unreadable";
    return (
      <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
        <Card className="w-full max-w-2xl py-6 md:py-8">
          <CardContent className="space-y-6 px-6 md:px-8">
            <div>
              <div className="mb-4">
                <AiMentionIllustration />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Descubre cuándo te recomienda la IA
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Investigaremos tu marca, te sugeriremos las preguntas que tus
                clientes hacen a la IA y seguiremos qué respuestas te mencionan
                o te citan.
              </p>
            </div>
            {getErrorCode(start.error) === "INSUFFICIENT_CREDITS" ? (
              <InsufficientCreditsError title="No hemos podido configurar la visibilidad en IA" />
            ) : (
              failed && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {unreadable
                      ? "No hemos podido leer esta web. Puede que su protección contra bots nos esté bloqueando. Describe tu negocio abajo y vuelve a intentarlo, o revisa la URL en los ajustes del proyecto."
                      : !start.isError && data.failure === "subrequest_limit"
                        ? "La configuración necesita más solicitudes salientes de las que permite Cloudflare Workers Free (50). Pasa a Workers Paid o usa la edición Docker y vuelve a intentarlo."
                        : isEveryAppClientAuthMode()
                          ? "No hemos podido terminar de configurar la visibilidad en IA. Necesita DataForSEO y OpenRouter en tu gateway de Every App: si aún no están configurados, un propietario o administrador debe ejecutar pnpm everyapp secret set DATAFORSEO_API_KEY OPENROUTER_API_KEY (o TREG_API_TOKEN en lugar de DATAFORSEO_API_KEY). Después, vuelve a intentarlo."
                          : "No hemos podido terminar de configurar la visibilidad en IA. Inténtalo de nuevo."}
                  </AlertDescription>
                </Alert>
              )
            )}
            {unreadable && (
              <Field>
                <FieldLabel htmlFor="business-overview">
                  Qué vendes, quién lo compra y dónde
                </FieldLabel>
                <Textarea
                  id="business-overview"
                  value={overview}
                  onChange={(event) => setOverview(event.target.value)}
                  maxLength={PROSE_MAX_CHARS}
                  rows={4}
                />
                {saveOverview.isError && (
                  <p className="text-sm text-destructive">
                    No hemos podido guardar tu descripción. Inténtalo de nuevo.
                  </p>
                )}
              </Field>
            )}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                pending={saveOverview.isPending}
                onClick={() =>
                  overview.trim() ? saveOverview.mutate() : start.mutate()
                }
              >
                {failed ? "Reintentar" : "Empezar investigación"}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isEveryAppClientAuthMode()
                  ? "La investigación y la primera ejecución de tus prompts usan las claves de DataForSEO y OpenRouter de tu gateway de Every App."
                  : "La investigación y la primera ejecución de tus prompts consumen una pequeña cantidad de créditos."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

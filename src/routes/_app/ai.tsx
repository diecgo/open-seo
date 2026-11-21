import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
import { z } from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { PageHeader } from "@/client/components/PageHeader";
import { ArrowUpRight, Info } from "lucide-react";
import { getClientAuthMode } from "@/lib/auth-mode";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  agentUpdatePrompt,
  getAgentSetupPrompt,
} from "@/client/features/ai-mcp/agentSetupPrompt";
import { CopyButton } from "@/client/components/CopyButton";
import { AgentList } from "@/client/features/ai-mcp/AgentList";
import { pageHead } from "@/client/lib/pageHead";

const DOCS_URL = "https://openseo.so/docs/agent-setup";

const COACH_DOCS_URL = "https://openseo.so/docs/skills/seo-coach";
const LINK_CLASS =
  "text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground";
const MUTED_LINK_CLASS =
  "inline-flex items-center gap-1 text-sm text-muted-foreground underline decoration-foreground/25 underline-offset-4 hover:text-foreground";
const SKILLS = [
  ["seo-coach", "Te explica dónde estás y elige tu siguiente paso."],
  [
    "seo-project-setup",
    "Guarda tus objetivos, competidores y páginas clave como contexto compartido.",
  ],
  [
    "seo-audit",
    "Auditoría del sitio en una página, centrada en una sola acción para esta semana.",
  ],
  [
    "ai-visibility-audit",
    "Encuentra los pocos cambios con más probabilidades de que te citen en las respuestas de IA.",
  ],
  [
    "ai-prompt-research",
    "Descubre qué pregunta la gente a ChatGPT sobre tu mercado y a quién cita.",
  ],
  [
    "keyword-research",
    "Encuentra oportunidades de palabras clave a partir de unos pocos temas semilla.",
  ],
  [
    "keyword-clustering",
    "Agrupa palabras clave por intención y las asigna a páginas.",
  ],
  ["competitive-landscape", "Muestra quién gana en tu mercado y por qué."],
  [
    "competitor-analysis",
    "Estudia las palabras clave, el contenido y los enlaces entrantes de un competidor.",
  ],
  [
    "link-prospecting",
    "Encuentra oportunidades de enlaces y redacta los mensajes de contacto.",
  ],
  [
    "local-seo",
    "Audita un perfil de empresa de Google y la visibilidad en Maps.",
  ],
  [
    "seo-report",
    "Guarda cualquiera de los anteriores como informe en tu página de Informes.",
  ],
];

const aiSearchSchema = z.object({
  // Active tab. Omitted for the default "setup" tab.
  tab: z.enum(["skills"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/ai")({
  head: () => pageHead("Configurar agente"),
  validateSearch: aiSearchSchema,
  component: AiPage,
});

const everyApp = getClientAuthMode() === "everyapp";

function AiPage() {
  const { tab = "setup" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const origin = window.location.origin;
  const mcpUrl = `${origin}/mcp`;
  const prompt = getAgentSetupPrompt(origin);

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Configurar agente"
          description="La forma más potente de usar OpenSEO es a través del agente de IA que ya usas. Configúralo una vez y pregúntale lo que quieras."
        />

        <Tabs
          value={tab}
          onValueChange={(value) =>
            void navigate({
              search: { tab: value === "skills" ? "skills" : undefined },
              replace: true,
            })
          }
          className="mt-8"
        >
          <TabsList variant="line">
            <TabsTrigger value="setup">Configura tu agente</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>
          <TabsContent value="setup">
            {everyApp ? (
              <EveryAppAgentSetup />
            ) : (
              <>
                <div className="mt-6 space-y-5">
                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>
                        <h2>Configura tu agente</h2>
                      </CardTitle>
                      <CardDescription>
                        Pega el prompt de configuración en tu agente para
                        conectar OpenSEO e instalar sus skills de SEO. Te guiará
                        en los pasos manuales que haga falta.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AgentList />
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <CopyButton
                          variant="default"
                          size="lg"
                          value={prompt}
                          label="Copiar prompt de configuración"
                          successMessage="Prompt de configuración copiado"
                          onCopy={() =>
                            captureClientEvent("mcp:setup_prompt_copy")
                          }
                        />
                        <a
                          href={`${DOCS_URL}#set-up-your-agent`}
                          target="_blank"
                          rel="noreferrer"
                          className={MUTED_LINK_CLASS}
                        >
                          Instrucciones de configuración
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </div>
                    </CardContent>
                    <CardFooter className="text-muted-foreground">
                      <p>
                        Cuando esté conectado, pide a tu agente que use{" "}
                        <a
                          href={COACH_DOCS_URL}
                          target="_blank"
                          rel="noreferrer"
                          className={LINK_CLASS}
                        >
                          SEO Coach
                        </a>{" "}
                        para que te ayude a elegir qué hacer después.
                      </p>
                    </CardFooter>
                  </Card>

                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>
                        <h2>Actualiza tus skills</h2>
                      </CardTitle>
                      <CardDescription>
                        ¿Ya estás conectado? Pega el prompt de actualización en
                        tu agente para tener las últimas skills de OpenSEO sin
                        perder tu configuración de conexión ni tus cambios.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <CopyButton
                        variant="default"
                        size="lg"
                        value={agentUpdatePrompt}
                        label="Copiar prompt de actualización"
                        successMessage="Prompt de actualización copiado"
                        onCopy={() =>
                          captureClientEvent("mcp:update_prompt_copy")
                        }
                      />
                      <a
                        href={`${DOCS_URL}#update-your-skills`}
                        target="_blank"
                        rel="noreferrer"
                        className={MUTED_LINK_CLASS}
                      >
                        Instrucciones de actualización
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </CardContent>
                  </Card>
                </div>

                {getClientAuthMode() === "cloudflare_access" ? (
                  <Alert className="mt-8">
                    <Info />
                    <AlertDescription>
                      Esta instancia está detrás de Cloudflare Access, así que
                      los clientes MCP se conectan con Managed OAuth en tu
                      aplicación de Access. Si un cliente ve una página de
                      inicio de sesión en vez de conectarse, comprueba que
                      Managed OAuth está activado.{" "}
                      <a
                        href="https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE_OPERATIONS.md#through-cloudflare-access"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium"
                      >
                        Guía de configuración
                      </a>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
                  <span>
                    URL del servidor MCP de esta instancia:{" "}
                    <code className="font-mono text-foreground/80">
                      {mcpUrl}
                    </code>
                  </span>
                  <CopyButton
                    value={mcpUrl}
                    successMessage="URL de MCP copiada"
                    onCopy={() => captureClientEvent("mcp:setup_url_copy")}
                  />
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="skills">
            <section className="mt-6">
              <p className="text-sm text-muted-foreground">
                {everyApp
                  ? "Instálalas con npx skills add every-app/open-seo."
                  : "El prompt de configuración las instala."}{" "}
                Ejecuta una por su nombre cuando quieras un informe completo en
                vez de una respuesta rápida.
              </p>
              <ul className="mt-5 space-y-3 text-sm sm:space-y-2">
                {SKILLS.map(([name, blurb]) => (
                  <li
                    key={name}
                    className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                  >
                    <a
                      href={`https://openseo.so/docs/skills/${name}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`shrink-0 font-mono text-[13px] sm:w-48 ${LINK_CLASS}`}
                    >
                      /{name}
                    </a>
                    <span className="text-muted-foreground">{blurb}</span>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const EVERY_APP_SKILLS_COMMAND = "npx skills add every-app/open-seo";

/**
 * Behind Every App the agent connects to the gateway's MCP address, which
 * covers every app on it; OpenSEO serves no MCP of its own here. The skills
 * install on their own.
 */
function EveryAppAgentSetup() {
  const gatewayUrl = useQuery(everyAppAccountQueryOptions()).data?.gatewayUrl;
  return (
    <div className="mt-6 space-y-5">
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Conecta tu agente a Every App</h2>
          </CardTitle>
          <CardDescription>
            Every App tiene una sola dirección para tu agente, que sirve para
            OpenSEO y tus otras apps. Conéctala una vez.
          </CardDescription>
        </CardHeader>
        {gatewayUrl ? (
          <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <code className="font-mono text-sm">{gatewayUrl}/mcp</code>
            <CopyButton
              value={`${gatewayUrl}/mcp`}
              successMessage="URL de MCP copiada"
            />
          </CardContent>
        ) : null}
      </Card>

      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Instala las skills de SEO</h2>
          </CardTitle>
          <CardDescription>
            Ejecuta esto en una terminal para añadir las skills de OpenSEO a tu
            agente. Usan OpenSEO a través de tu conexión con Every App.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <code className="font-mono text-sm">{EVERY_APP_SKILLS_COMMAND}</code>
          <CopyButton
            value={EVERY_APP_SKILLS_COMMAND}
            successMessage="Comando copiado"
          />
        </CardContent>
        <CardFooter className="text-muted-foreground">
          <p>
            Cuando esté conectado, pide a tu agente que use{" "}
            <a
              href={COACH_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className={LINK_CLASS}
            >
              SEO Coach
            </a>{" "}
            para que te ayude a elegir qué hacer después.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

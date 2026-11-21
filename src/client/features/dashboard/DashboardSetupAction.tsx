import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ONE_CLICK_INSTALLS } from "@/client/features/ai-mcp/agentInstalls";
import { getAgentSetupPrompt } from "@/client/features/ai-mcp/agentSetupPrompt";
import {
  AgentSetupPanel,
  AGENT_SETUP_DESCRIPTION,
} from "@/client/features/ai-mcp/AgentSetupPanel";
import { CopyButton } from "@/client/components/CopyButton";
import { CreateProjectModal } from "@/client/features/projects/CreateProjectModal";
import { InviteTeammateModal } from "@/client/features/team/InviteTeammateModal";
import { PermissionHint } from "@/client/components/PermissionHint";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { usesBetterAuthClient } from "@/lib/auth-mode";
import { hasOrgPermission } from "@/lib/org-permissions";
import { listMcpConnections } from "@/serverFunctions/mcp-connections";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";
import { parseResearchTarget } from "@/shared/researchScope";

const projectPrompt = `Usa OpenSEO para crear un proyecto independiente para cada sitio web de la lista. Primero lista mis proyectos existentes y reutiliza los que coincidan para no crear duplicados. Configura el país y el idioma de cada sitio y pregúntame lo que falte.

Sustituye esta lista por mis sitios web:
- Nombre del proyecto — sitio web — país — idioma`;

export function DashboardSetupAction({
  step,
  projectId,
  domain,
  onComplete,
}: {
  step: DashboardSetupStep;
  projectId: string;
  domain: string | null;
  onComplete: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const org = useQuery(organizationContextQueryOptions());
  // Research steps open the page with the user's input already applied, so
  // the research runs on arrival and completes the step.
  if (step === "competitor")
    return (
      <StepInputForm
        description="Explora el dominio de un competidor para descubrir los temas por los que posiciona y los sitios que lo enlazan."
        label="Sitio web del competidor"
        placeholder="competitor.com"
        submitLabel="Explorar competidor"
        validate={validateDomain}
        onSubmit={(value) => {
          onComplete();
          void navigate({
            to: "/p/$projectId/domain",
            params: { projectId },
            search: { domain: parseDomain(value) },
          });
        }}
      />
    );
  if (step === "keywords")
    return (
      <StepInputForm
        description="Empieza con una palabra clave que describa lo que ofreces. Obtendrás búsquedas relacionadas con volumen y dificultad."
        label="Palabra clave semilla"
        placeholder="p. ej., zapatillas de running"
        submitLabel="Obtener ideas de palabras clave"
        validate={(value) =>
          value.trim() ? undefined : "Introduce una palabra clave para empezar"
        }
        onSubmit={(value) => {
          onComplete();
          void navigate({
            to: "/p/$projectId/keywords",
            params: { projectId },
            search: { q: value.trim() },
          });
        }}
      />
    );
  if (step === "audit")
    return (
      <StepInputForm
        description="Rastrea tu sitio para encontrar enlaces rotos, etiquetas ausentes y páginas que los buscadores no pueden indexar. Puedes ajustar el tamaño del rastreo antes de empezar."
        label="URL del sitio"
        placeholder="https://example.com"
        defaultValue={domain ? `https://${domain}` : ""}
        submitLabel="Configurar auditoría"
        validate={validateDomain}
        onSubmit={(value) => {
          onComplete();
          void navigate({
            to: "/p/$projectId/audit",
            params: { projectId },
            search: { url: value.trim() },
          });
        }}
      />
    );
  if (step === "mcp")
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {AGENT_SETUP_DESCRIPTION}
        </p>
        <AgentSetupPanel
          prompt={getAgentSetupPrompt(
            typeof window === "undefined"
              ? "https://app.openseo.so"
              : window.location.origin,
          )}
          onCopy={() =>
            captureClientEvent("onboarding:setup_prompt_copy", {
              source: "dashboard",
            })
          }
        />
      </div>
    );
  if (step === "skills") return <DashboardSkillsAction domain={domain} />;

  const canManage =
    org.data &&
    hasOrgPermission(
      org.data.role,
      step === "project" ? { project: ["create"] } : { invitation: ["create"] },
    );
  if (!canManage)
    return org.isPending ? (
      <p className="text-sm text-muted-foreground">
        Comprobando permisos del espacio de trabajo…
      </p>
    ) : org.isError ? (
      <p className="text-sm text-muted-foreground">
        {getStandardErrorMessage(org.error)}
      </p>
    ) : (
      <PermissionHint action="ayudar con este paso" />
    );
  if (step === "project")
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mantén la investigación, las posiciones y las conexiones de cada sitio
          web en su propio proyecto. Usa el selector de proyectos de la barra
          lateral → Nuevo proyecto cuando quieras.
        </p>
        <Button onClick={() => setShowModal(true)}>Crear otro proyecto</Button>
        <Collapsible className="rounded-lg border border-border p-4">
          <CollapsibleTrigger className="cursor-pointer text-sm font-medium">
            ¿Tienes una lista de sitios web? Deja que tu agente los configure.
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/ai"
                className="text-primary underline-offset-4 hover:underline"
              >
                Conecta tu agente
              </Link>
              y pega este prompt con tu lista de sitios web.
            </p>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-muted-foreground">
              {projectPrompt}
            </pre>
            <CopyButton
              value={projectPrompt}
              label="Copiar prompt de proyectos"
              successMessage="Prompt de proyectos copiado"
            />
          </CollapsibleContent>
        </Collapsible>
        {showModal && (
          <CreateProjectModal onClose={() => setShowModal(false)} />
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Invita a un compañero a tu espacio de trabajo para compartir proyectos,
        investigación y resultados.
      </p>
      <Button onClick={() => setShowModal(true)}>Invitar a un compañero</Button>
      {showModal && (
        <InviteTeammateModal
          onClose={() => setShowModal(false)}
          onInvited={() => {
            void queryClient.invalidateQueries({
              queryKey: ["organization-team"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["dashboardActivation"],
            });
          }}
        />
      )}
    </div>
  );
}

function getSkillsSetupPrompt(domain: string | null) {
  const site = domain ? ` para ${domain}` : "";
  return `Comprueba si tengo las skills de OpenSEO configuradas en este agente. Si no, guíame para instalarlas con https://openseo.so/docs/skills/setup. Después recomiéndame la skill de OpenSEO más útil para probar primero${site} y enséñame a usarla.`;
}

function DashboardSkillsAction({ domain }: { domain: string | null }) {
  const connections = useQuery({
    queryKey: ["mcpConnections"],
    queryFn: () => listMcpConnections(),
    enabled: usesBetterAuthClient(),
  });
  const grants = connections.data ?? [];
  const chats = ONE_CLICK_INSTALLS.filter(({ agent }) =>
    grants.some((grant) => grant.webChat === agent),
  );
  const prompt = getSkillsSetupPrompt(domain);

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Las skills guían a tu agente por flujos de SEO completos y guardan los
        resultados como informes.{" "}
        {chats.length > 0
          ? "Abre un chat para comprobar tu configuración de skills y elegir una para probar."
          : "Pega este prompt en tu agente para comprobar tu configuración de skills y elegir una para probar."}
      </p>
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background/25 p-3.5 font-sans text-sm leading-relaxed text-muted-foreground">
        {prompt}
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        {chats.map(({ agent, name, newChatUrl, Icon }) => (
          <Button
            key={agent}
            variant={chats.length === 1 ? "default" : "outline"}
            nativeButton={false}
            render={
              <a href={newChatUrl(prompt)} target="_blank" rel="noreferrer" />
            }
            onClick={() =>
              captureClientEvent("dashboard:skills_open_in_agent_click", {
                agent,
              })
            }
          >
            <Icon data-icon="inline-start" />
            Abrir en {name}
          </Button>
        ))}
        <CopyButton
          value={prompt}
          label="Copiar prompt"
          successMessage="Prompt copiado"
          variant={chats.length === 0 ? "default" : "outline"}
          size="default"
          onCopy={() => captureClientEvent("dashboard:skills_prompt_copy")}
        />
        <Link
          to="/ai"
          search={{ tab: "skills" }}
          className="ml-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Ver skills
        </Link>
      </div>
    </div>
  );
}

function validateDomain(value: string) {
  const parsed = parseResearchTarget(value);
  return parsed.ok ? undefined : parsed.message;
}

function parseDomain(value: string) {
  const parsed = parseResearchTarget(value);
  return parsed.ok ? parsed.target.hostname : value.trim();
}

function StepInputForm({
  description,
  label,
  placeholder,
  defaultValue = "",
  submitLabel,
  validate,
  onSubmit,
}: {
  description: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  submitLabel: string;
  validate: (value: string) => string | undefined;
  onSubmit: (value: string) => void;
}) {
  const form = useForm({
    defaultValues: { value: defaultValue },
    onSubmit: ({ value }) => onSubmit(value.value),
  });
  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <form.Field
        name="value"
        validators={{
          // Stay quiet while the user is still typing; validate on submit, and
          // keep validating live after the first attempt.
          onChange: ({ value, fieldApi }) =>
            fieldApi.form.state.submissionAttempts > 0
              ? validate(value)
              : undefined,
        }}
      >
        {(field) => (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{label}</span>
            <Input
              type="text"
              maxLength={255}
              placeholder={placeholder}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-12 px-4 md:text-base"
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive">
                {field.state.meta.errors.join(", ")}
              </span>
            )}
          </label>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" size="lg" disabled={!canSubmit}>
            {submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

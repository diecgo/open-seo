import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { identity, sortBy } from "remeda";
import { Columns3, SearchCheck, Sparkles } from "lucide-react";
import { useHostedPlanGate } from "@/client/features/billing/HostedPlanGate";
import { ResearchPageShell } from "@/client/features/ai-search/ResearchPageShell";
import { PromptTrackingWithoutUpgradeButton } from "@/client/features/ai-visibility/shared";
import { PromptExplorerForm } from "@/client/features/ai-search/components/PromptExplorerForm";
import { PromptExplorerLoadingState } from "@/client/features/ai-search/components/PromptExplorerLoadingState";
import { PromptExplorerResults } from "@/client/features/ai-search/components/PromptExplorerResults";
import {
  PROMPT_EXPLORER_STALE_TIME_MS,
  buildPromptExplorerQueryKey,
  promptExplorerQueryFn,
  type PromptExplorerSearch,
} from "@/client/features/ai-search/promptExplorerQuery";
import { SearchTabStrip } from "@/client/features/search-tabs/SearchTabStrip";
import type {
  PromptSearchTabInput,
  SearchTabInput,
} from "@/client/features/search-tabs/types";
import { useSearchTabNavigation } from "@/client/features/search-tabs/useSearchTabNavigation";
import { ModelAnswersIllustration } from "@/client/components/EmptyIllustrations";
import { RecentSearches } from "@/client/components/RecentSearches";
import { BackLink } from "@/client/components/PageHeader";
import { formatModelLabel } from "@/shared/prompt-explorer-labels";
import { usePromptExplorerSearchHistory } from "@/client/hooks/usePromptExplorerSearchHistory";
import {
  BRAND_LOOKUP_MAX_INPUT_LENGTH,
  PROMPT_EXPLORER_MAX_PROMPT_LENGTH,
} from "@/types/schemas/ai-search";

type PromptExplorerFormValues = PromptExplorerSearch;

type Props = {
  projectId: string;
  urlState: PromptExplorerFormValues;
  onSubmit: (values: PromptExplorerFormValues) => void;
  /** Clears the active search, back to recent searches. */
  onClear: () => void;
};

const PROMPT_EXPLORER_BULLETS = [
  {
    icon: Columns3,
    title: "Cuatro modelos en paralelo",
    body: "Lanza un prompt en ChatGPT, Claude, Gemini y Perplexity y compara las respuestas en una sola vista.",
  },
  {
    icon: SearchCheck,
    title: "Mira qué citan los modelos",
    body: "Cada respuesta indica las fuentes que ha usado, para que puedas revisar de dónde saca cada modelo su información.",
  },
  {
    icon: Sparkles,
    title: "Comprueba las menciones de marca",
    body: "Destaca una marca para ver al instante si aparece en el texto de la respuesta o en las fuentes citadas.",
  },
];

// The strip truncates labels to its width; the tooltip shows the full prompt.
function promptTabLabel(input: SearchTabInput) {
  if (input.type !== "prompt") return "";
  return input.models.length > 1
    ? `${input.prompt} · ${input.models.length} modelos`
    : input.prompt;
}

export function PromptExplorerPage({
  projectId,
  urlState,
  onSubmit,
  onClear,
}: Props) {
  const planStatus = useHostedPlanGate();
  const [form, setForm] = useState<PromptExplorerFormValues>(urlState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    history,
    isLoaded: historyLoaded,
    addSearch,
    removeHistoryItem,
  } = usePromptExplorerSearchHistory(projectId);

  const trimmedPrompt = urlState.prompt.trim();
  const hasActivePrompt = trimmedPrompt.length > 0;

  const urlInput = useMemo<PromptSearchTabInput | null>(() => {
    const prompt = urlState.prompt.trim();
    if (!prompt) return null;
    return {
      type: "prompt",
      ...urlState,
      prompt,
      highlightBrand: urlState.highlightBrand.trim(),
    };
  }, [urlState]);

  const searchTabs = useSearchTabNavigation({
    storageKey: `prompt-explorer:${projectId}`,
    urlInput,
    getLabel: promptTabLabel,
    navigateToInput: useCallback(
      (input: SearchTabInput | null) => {
        if (input?.type !== "prompt") {
          onClear();
          return;
        }
        const { type: _type, ...search } = input;
        onSubmit(search);
      },
      [onClear, onSubmit],
    ),
  });

  const exploreQuery = useQuery({
    queryKey: buildPromptExplorerQueryKey(projectId, urlState),
    queryFn: () => promptExplorerQueryFn(projectId, urlState),
    // Client-side gate is a UX optimization only; the paywall is enforced
    // in the shared service before any DataForSEO spend,
    // so a stale free-plan window here just yields a rejected request, not cost.
    enabled: hasActivePrompt && planStatus === "paid",
    staleTime: PROMPT_EXPLORER_STALE_TIME_MS,
    gcTime: PROMPT_EXPLORER_STALE_TIME_MS,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = form.prompt.trim();
    if (trimmed.length === 0) {
      setValidationError("Introduce un prompt");
      return;
    }
    if (trimmed.length > PROMPT_EXPLORER_MAX_PROMPT_LENGTH) {
      setValidationError(
        `El prompt debe tener menos de ${PROMPT_EXPLORER_MAX_PROMPT_LENGTH} caracteres`,
      );
      return;
    }
    if (form.highlightBrand.trim().length > BRAND_LOOKUP_MAX_INPUT_LENGTH) {
      setValidationError(
        `La marca debe tener menos de ${BRAND_LOOKUP_MAX_INPUT_LENGTH} caracteres`,
      );
      return;
    }
    if (form.models.length === 0) {
      setValidationError("Selecciona al menos un modelo");
      return;
    }
    setValidationError(null);
    onSubmit({
      ...form,
      prompt: trimmed,
      highlightBrand: form.highlightBrand.trim(),
    });
  };

  const updateForm = <K extends keyof PromptExplorerFormValues>(
    key: K,
    value: PromptExplorerFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationError) setValidationError(null);
  };

  // The project is part of both keys, so switching projects resets the form
  // and records the search in the new project's history.
  const historyKey = [
    projectId,
    trimmedPrompt,
    urlState.highlightBrand.trim(),
    sortBy(urlState.models, identity()).join(","),
    urlState.webSearch,
    urlState.webSearchCountryCode,
  ].join("|");

  return (
    <ResearchPageShell
      contained
      title="Explorador de prompts"
      description="Lanza cualquier prompt en ChatGPT, Claude, Gemini y Perplexity y compara las respuestas."
      gate={{
        feature: "Explorador de prompts",
        description:
          "Lanza un prompt en ChatGPT, Claude, Gemini y Perplexity a la vez y compara sus respuestas, incluidas las fuentes que cita cada modelo.",
        features: PROMPT_EXPLORER_BULLETS,
        alternative: (
          <PromptTrackingWithoutUpgradeButton projectId={projectId} />
        ),
      }}
      form={
        <PromptExplorerForm
          form={form}
          onPromptChange={(value) => updateForm("prompt", value)}
          onHighlightBrandChange={(value) =>
            updateForm("highlightBrand", value)
          }
          onModelsChange={(value) => updateForm("models", value)}
          onWebSearchChange={(value) => updateForm("webSearch", value)}
          onCountryChange={(value) => updateForm("webSearchCountryCode", value)}
          onSubmit={handleSubmit}
          validationError={validationError}
        />
      }
      tabs={
        hasActivePrompt ? (
          <SearchTabStrip
            projectId={projectId}
            activeTabId={searchTabs.activeTabId}
            tabs={searchTabs.tabs}
            onSelect={searchTabs.selectTab}
            onClose={searchTabs.closeTab}
            onViewed={searchTabs.markTabViewed}
          />
        ) : null
      }
      loadingState={<PromptExplorerLoadingState models={urlState.models} />}
      query={exploreQuery}
      hasActiveQuery={hasActivePrompt}
      errorFallback="No se pudieron cargar los resultados del prompt"
      // Covers browser back/forward and history links. The route builds a
      // fresh `urlState` object on every render, so compare by value.
      urlKey={`${projectId}:${JSON.stringify(urlState)}`}
      onUrlChange={() => {
        setForm(urlState);
        setValidationError(null);
      }}
      historyKey={historyKey}
      onSuccess={() =>
        addSearch({
          prompt: trimmedPrompt,
          highlightBrand: urlState.highlightBrand.trim(),
          models: urlState.models,
          webSearch: urlState.webSearch,
          webSearchCountryCode: urlState.webSearchCountryCode,
        })
      }
      backLink={
        <BackLink
          from="/p/$projectId/prompt-explorer"
          to="/p/$projectId/prompt-explorer"
          params={{ projectId }}
          search={{}}
          replace
        >
          Búsquedas recientes
        </BackLink>
      }
      renderResults={(result) => <PromptExplorerResults result={result} />}
      history={
        <RecentSearches
          items={history}
          loaded={historyLoaded}
          onRemove={removeHistoryItem}
          emptyIllustration={<ModelAnswersIllustration />}
          emptyTitle="Descubre qué dice la IA sobre tu mercado"
          emptyDescription="La respuesta de cada modelo incluye las fuentes que ha citado."
          getTitle={(item) => item.prompt}
          getSubtitle={(item) => item.models.map(formatModelLabel).join(", ")}
          renderLink={(item, props) => (
            <Link
              from="/p/$projectId/prompt-explorer"
              to="/p/$projectId/prompt-explorer"
              params={{ projectId }}
              search={{
                q: item.prompt,
                models: item.models,
                web: item.webSearch ? undefined : false,
                cc: item.webSearchCountryCode,
                hb: item.highlightBrand || undefined,
              }}
              replace
              {...props}
            />
          )}
        />
      }
    />
  );
}

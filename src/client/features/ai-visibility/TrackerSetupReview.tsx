import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { DialogFooter } from "@/client/components/ui/dialog";
import { aiMarketLabel, type AiCostEstimate } from "@/shared/ai-visibility";
import { EngineLabel } from "./EngineLabel";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { AiQueryError, aiMoney } from "./shared";

const SCHEDULE_FREQUENCY: Record<string, string> = {
  daily: "cada día",
  weekly: "cada semana",
  monthly: "cada mes",
};

export type TrackerSetupReviewData = {
  patch: AiTrackerPatch;
  estimate: AiCostEstimate;
};

export function TrackerSetupReview({
  review,
  enabled,
  creating,
  pending,
  error,
  canSchedule,
  scheduling,
  onBack,
  onSave,
  onSaveAndSchedule,
}: {
  review: TrackerSetupReviewData;
  enabled: boolean;
  /** No tracker yet; saving creates one on the weekly schedule. */
  creating: boolean;
  pending: boolean;
  error: unknown;
  canSchedule: boolean;
  scheduling: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveAndSchedule: () => void;
}) {
  const paused = !enabled && !creating;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Revisa los cambios antes de guardar.{" "}
        {enabled
          ? "Estos ajustes se aplican a tu programación activa."
          : creating
            ? "El seguimiento es semanal. La primera comprobación será dentro de una semana; usa Ejecutar ahora para tener resultados antes."
            : "Haz un seguimiento semanal para recopilar respuestas nuevas una vez por semana. Un rastreador que nunca se ha ejecutado de forma programada también hace ahora su primera comprobación."}
      </p>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm border-border">
        {review.patch.engines && (
          <div>
            <dt className="text-muted-foreground">Motores</dt>
            <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {review.patch.engines?.map((engine) => (
                <EngineLabel key={engine} engine={engine} />
              ))}
            </dd>
          </div>
        )}
        {review.patch.prompts !== undefined && (
          <div>
            <dt className="text-muted-foreground">Prompts nuevos</dt>
            <dd className="mt-1">{review.patch.prompts?.length ?? 0}</dd>
          </div>
        )}
        {review.patch.prompts?.[0]?.topic && (
          <div>
            <dt className="text-muted-foreground">Tema</dt>
            <dd className="mt-1">{review.patch.prompts[0].topic}</dd>
          </div>
        )}
        {review.patch.locationCode && review.patch.languageCode && (
          <div>
            <dt className="text-muted-foreground">Mercado</dt>
            <dd className="mt-1">
              {aiMarketLabel({
                locationCode: review.patch.locationCode,
                languageCode: review.patch.languageCode,
              })}
            </dd>
          </div>
        )}
      </dl>
      {!!review.patch.prompts?.length && (
        <div
          className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-4 border-border"
          data-ph-mask
        >
          <h3 className="text-sm font-semibold">Prompts que se añadirán</h3>
          {review.patch.prompts.map((prompt) => (
            <p
              key={prompt.text}
              className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed"
            >
              {prompt.text}
            </p>
          ))}
        </div>
      )}
      <div className="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
        <p>
          Cada ejecución recopila{" "}
          <strong>{review.estimate.observations}</strong>{" "}
          {review.estimate.observations === 1 ? "respuesta" : "respuestas"} por{" "}
          <strong>{aiMoney(review.estimate.costUsd)}</strong>
        </p>
        <p>
          <strong>{aiMoney(review.estimate.monthlyCostUsd)}</strong> estimados
          al mes si se ejecuta{" "}
          {SCHEDULE_FREQUENCY[review.estimate.scheduleInterval] ??
            review.estimate.scheduleInterval}
          .
        </p>
      </div>
      {!!error && <AiQueryError error={error} />}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onBack}
        >
          Volver a editar
        </Button>
        <Button
          type="button"
          variant={paused ? "secondary" : "default"}
          disabled={pending}
          onClick={onSave}
        >
          {pending && !scheduling && (
            <Loader2 className="size-4 animate-spin" />
          )}
          {enabled
            ? "Guardar cambios revisados"
            : creating
              ? "Guardar y seguir cada semana"
              : "Guardar en pausa"}
        </Button>
        {paused && (
          <Button
            type="button"
            disabled={
              pending || !canSchedule || review.estimate.observations === 0
            }
            onClick={onSaveAndSchedule}
          >
            {pending && scheduling && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Guardar y seguir cada semana
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

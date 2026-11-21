import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import { devicesCount, RANK_CHECK_DURATION_COPY } from "@/shared/rank-tracking";

export function CheckConfirmModal({
  keywordCount,
  devices,
  costUsd,
  isScheduled,
  isPending,
  onRunNow,
  onCancel,
}: {
  keywordCount: number;
  devices: RankTrackingConfig["devices"];
  /** Server estimate; it prices each keyword's text (operators cost 5x). */
  costUsd: number | undefined;
  /** Whether the tracker also checks on a schedule. */
  isScheduled: boolean;
  isPending: boolean;
  onRunNow: () => void;
  onCancel: () => void;
}) {
  const dc = devicesCount(devices);

  return (
    <ConfirmDialog
      title={`¿Comprobar ${keywordCount} palabra${keywordCount !== 1 ? "s" : ""} clave?`}
      confirmLabel="Iniciar comprobación"
      pending={isPending}
      onConfirm={onRunNow}
      onClose={onCancel}
    >
      <span className="flex flex-col gap-1">
        <span>
          {keywordCount} palabra{keywordCount !== 1 ? "s" : ""} clave &times;{" "}
          {dc} dispositivo{dc !== 1 ? "s" : ""}
        </span>
        {costUsd != null ? (
          <span>
            Cuesta hasta{" "}
            <span className="font-mono font-semibold text-foreground">
              ${costUsd.toFixed(2)}
            </span>
          </span>
        ) : null}
        <span>
          {RANK_CHECK_DURATION_COPY}
          {isScheduled ? " Tu seguimiento programado no cambiará." : null}
        </span>
      </span>
    </ConfirmDialog>
  );
}

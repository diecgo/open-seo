import { useState } from "react";
import { MoreHorizontal, Play, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

function ItemText({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="flex flex-col">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </span>
  );
}

export function MoreMenu({
  onCheckNow,
  checkBusy,
  onRefreshMetrics,
  metricsRefreshing,
  trackedKeywordCount,
  hasData,
}: {
  onCheckNow: () => void;
  checkBusy: boolean;
  onRefreshMetrics: () => void;
  metricsRefreshing: boolean;
  trackedKeywordCount: number;
  hasData: boolean;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Más acciones"
              title="Más acciones"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={onCheckNow} disabled={checkBusy}>
            <Play />
            <ItemText
              label={checkBusy ? "Comprobando…" : "Comprobar ahora"}
              description="Obtén las posiciones actuales en Google"
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmingRefresh(true)}
            disabled={metricsRefreshing || !hasData}
          >
            <RefreshCw className={metricsRefreshing ? "animate-spin" : ""} />
            <ItemText
              label={
                metricsRefreshing ? "Actualizando…" : "Actualizar métricas"
              }
              description="Volumen, dificultad y CPC (no posiciones)"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmingRefresh ? (
        <ConfirmDialog
          title="¿Actualizar métricas de las palabras clave?"
          confirmLabel="Actualizar métricas"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          Obtiene de nuevo el volumen, la dificultad y el CPC de{" "}
          {trackedKeywordCount !== 1 ? "las" : "la"} {trackedKeywordCount}{" "}
          palabra{trackedKeywordCount !== 1 ? "s" : ""} clave seguida
          {trackedKeywordCount !== 1 ? "s" : ""}. Cada palabra clave usa
          créditos. Las posiciones no cambian.
        </ConfirmDialog>
      ) : null}
    </>
  );
}

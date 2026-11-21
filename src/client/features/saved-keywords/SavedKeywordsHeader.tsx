import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { ImportKeywordsButton } from "./ImportKeywordsDialog";

export function SavedKeywordsHeader({
  projectId,
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
}: {
  projectId: string;
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title="Palabras guardadas"
        description="Guarda ideas de palabras clave, organízalas con etiquetas y vuelve a ellas cuando quieras actuar."
        actions={
          <>
            <ImportKeywordsButton projectId={projectId} />
            <Button
              variant="outline"
              size="sm"
              title="Obtener nuevo volumen, dificultad y CPC"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "Actualizando..." : "Actualizar métricas"}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />
          </>
        }
      />

      {confirmingRefresh ? (
        <ConfirmDialog
          title="¿Actualizar las métricas de las palabras clave?"
          confirmLabel="Actualizar métricas"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          Se obtendrán de nuevo el volumen, la dificultad y el CPC de todas las
          palabras clave guardadas en este proyecto. Cada palabra clave consume
          créditos.
        </ConfirmDialog>
      ) : null}
    </>
  );
}

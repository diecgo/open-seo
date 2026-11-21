import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import type { AuditResultsData } from "@/client/features/audit/results/types";

/** Report notices about JavaScript: app shells, and pages a render missed. */
export function RenderingWarnings({ data }: { data: AuditResultsData }) {
  const rendered = data.audit.config.renderJavaScript;
  const hasShells = data.issueGroups.some(
    (group) => group.issueType === "javascript-rendering-suspected",
  );
  const unreadCount = data.fetchClassCounts.error;

  return (
    <>
      {hasShells && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            Algunas páginas pueden necesitar JavaScript para mostrar su
            contenido.
          </AlertTitle>
          <AlertDescription>
            {rendered
              ? "Seguían cargando después del renderizado, así que no hemos podido comprobarlas."
              : "Activa Renderizar JavaScript y vuelve a lanzar la auditoría para comprobarlas."}
          </AlertDescription>
        </Alert>
      )}

      {rendered && unreadCount > 0 && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            No hemos podido leer {unreadCount}{" "}
            {unreadCount === 1 ? "página" : "páginas"}.
          </AlertTitle>
          <AlertDescription>
            Para verlas, abre Páginas y filtra Resultado del rastreo por
            Fallida.
          </AlertDescription>
        </Alert>
      )}

      {rendered && (
        <p className="text-sm text-muted-foreground">
          El renderizado de JavaScript estaba activado en esta auditoría.
        </p>
      )}
    </>
  );
}

import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { InsufficientCreditsError } from "@/client/features/billing/InsufficientCreditsError";
import {
  isOutOfCreditsRunError,
  RANK_CHECK_DELAYED_ERROR,
} from "@/shared/rank-tracking";
import type { useRankRunPolling } from "./useRankRunPolling";

function ReadWhatChangedLink() {
  return (
    <a
      href="https://openseo.so/blogs/state-of-rank-tracking-november-2026"
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-4"
    >
      Lee qué ha cambiado
    </a>
  );
}

/** The latest rank check's state: running, delayed, stale, failed, or incomplete. */
export function RankRunAlerts({
  run,
}: {
  run: ReturnType<typeof useRankRunPolling>;
}) {
  if (!run) return null;

  if (run.maybeStale) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          Esta comprobación ha dejado de responder. Puedes iniciar una nueva
          para sustituirla.
        </AlertDescription>
      </Alert>
    );
  }

  if (run.isDelayed) {
    return (
      <Alert variant="warning">
        <Clock />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              Esta comprobación va con retraso
            </span>{" "}
            porque nuestro proveedor de datos de búsqueda va lento. Seguiremos
            esperando hasta 6 horas. Puedes salir de esta página.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "pending" || run.status === "running") {
    return (
      <Alert variant="info">
        <Clock />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              Esta comprobación tarda una hora
            </span>{" "}
            porque los resultados de Google no son fiables últimamente. Puedes
            salir de esta página mientras se ejecuta. <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed" && isOutOfCreditsRunError(run.errorMessage)) {
    return (
      <InsufficientCreditsError title="Tu última comprobación de posiciones no se ha ejecutado" />
    );
  }

  if (
    run.status === "failed" &&
    run.errorMessage === RANK_CHECK_DELAYED_ERROR
  ) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              No hemos podido terminar tu última comprobación.
            </span>{" "}
            Nuestro proveedor de datos de búsqueda no ha devuelto los resultados
            de Google en 6 horas. Vuelve a intentarlo más tarde.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed") {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              No hemos podido terminar tu última comprobación.
            </span>{" "}
            Últimamente los resultados de Google no son fiables para ningún
            rastreador de posiciones. Vuelve a intentarlo más tarde.{" "}
            <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // A completed run only has an error message when some checks have no result.
  if (run.status === "completed" && run.errorMessage) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              No se han podido comprobar algunas palabras clave.
            </span>{" "}
            Últimamente los resultados de Google no son fiables para ningún
            rastreador de posiciones, así que muestran su última posición
            conocida. <ReadWhatChangedLink />
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

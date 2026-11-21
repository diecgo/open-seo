import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RankTrackingChangesAlert() {
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            El seguimiento de posiciones ahora detecta y sustituye los
            resultados incompletos de Google.
          </span>{" "}
          Desde septiembre, Google sirve resultados incompletos a todos los
          rastreadores de posiciones.{" "}
          <a
            href="https://openseo.so/blogs/state-of-rank-tracking-november-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Lee qué ha cambiado
          </a>
        </p>
      </AlertDescription>
    </Alert>
  );
}

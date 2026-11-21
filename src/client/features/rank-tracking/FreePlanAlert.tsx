import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanAlert({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle />
      <AlertDescription className="text-foreground">
        <p>
          Solo empezamos a seguir las posiciones de tus palabras clave cuando{" "}
          <Link
            to={SUBSCRIBE_ROUTE}
            search={{ upgrade: true }}
            className="font-medium underline underline-offset-3"
          >
            te pasas al plan de pago
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}

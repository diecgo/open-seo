import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import {
  updatePrivacyChoices,
  usePrivacyChoices,
} from "@/client/components/PrivacyChoices";
import { Switch } from "@/client/components/ui/switch";
import { useSession } from "@/lib/auth-client";
import { setProductUpdatesOptIn } from "@/serverFunctions/product-updates";

export function PrivacySettings() {
  const choices = usePrivacyChoices();
  const { data: session, refetch } = useSession();
  const productUpdates = useMutation({
    mutationFn: (optIn: boolean) => setProductUpdatesOptIn({ data: { optIn } }),
    // The session is served from a signed cookie cache, so bypass it to pick
    // up the saved choice.
    onSuccess: () => refetch({ query: { disableCookieCache: true } }),
    onError: () =>
      toast.error("No hemos podido guardar tu preferencia de emails."),
  });
  if (!choices || !session) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Privacidad y emails" />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Analítica de uso</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte la analítica de uso y las grabaciones de sesión para ayudar
            a mejorar OpenSEO.
          </p>
        </div>
        <Switch
          checked={choices.analytics}
          onCheckedChange={(analytics) =>
            void updatePrivacyChoices({ ...choices, analytics }, true)
          }
          aria-label="Compartir analítica de uso"
        />
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Novedades del producto</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails ocasionales sobre funciones nuevas y consejos. Puedes darte
            de baja cuando quieras.
          </p>
        </div>
        <Switch
          checked={
            productUpdates.isPending
              ? productUpdates.variables
              : session.user.productUpdatesOptIn === true
          }
          disabled={productUpdates.isPending}
          onCheckedChange={(optIn) => productUpdates.mutate(optIn)}
          aria-label="Recibir emails con novedades del producto"
        />
      </div>
    </section>
  );
}

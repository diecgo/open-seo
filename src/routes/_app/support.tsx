import { createFileRoute } from "@tanstack/react-router";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { SUPPORT_EMAIL } from "@/client/lib/support";
import { pageHead } from "@/client/lib/pageHead";

const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";
const GITHUB_URL = "https://github.com/every-app/open-seo";

export const Route = createFileRoute("/_app/support")({
  head: () => pageHead("Ayuda y comunidad"),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Ayuda y comunidad
          </p>
          <PageHeader
            title="Queremos saber de ti"
            description="Nos encanta recibir comentarios y saber cómo trabajas para mejorar OpenSEO."
          />
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Email</h2>
              </CardTitle>
              <CardDescription>
                Envíanos ideas, problemas, dudas o comentarios directamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyButton
                value={SUPPORT_EMAIL}
                label={SUPPORT_EMAIL}
                successMessage="Email copiado al portapapeles"
                size="sm"
              />
            </CardContent>
          </Card>

          <SupportLinkCard
            href={DISCORD_URL}
            title="Discord"
            description="Pide ayuda, comparte ideas y aprende de la comunidad."
            cta="Únete al Discord"
          />

          <SupportLinkCard
            href={`${GITHUB_URL}/issues`}
            title="GitHub Issues"
            description="Informa de errores o pide funciones en GitHub."
            cta="Abrir una incidencia"
          />
        </div>
      </div>
    </div>
  );
}

function SupportLinkCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <Card className="transition-colors group-hover:border-foreground/20">
        <CardHeader>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="font-medium">
          {cta} <span aria-hidden="true">&rarr;</span>
        </CardContent>
      </Card>
    </a>
  );
}

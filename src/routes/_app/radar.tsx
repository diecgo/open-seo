import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { Badge } from "@/client/components/ui/badge";
import { pageHead } from "@/client/lib/pageHead";
import { getSalesRadar } from "@/serverFunctions/salesRadar";

const salesRadarQueryOptions = () =>
  queryOptions({
    queryKey: ["sales-radar"],
    queryFn: () => getSalesRadar(),
  });

export const Route = createFileRoute("/_app/radar")({
  head: () => pageHead("Radar de ventas"),
  component: SalesRadarPage,
});

type RadarProject = Awaited<ReturnType<typeof getSalesRadar>>[number];

function scoreVariant(score: number) {
  if (score >= 60) return "destructive" as const;
  if (score >= 30) return "warning" as const;
  return "secondary" as const;
}

function ProjectCard({ project }: { project: RadarProject }) {
  const sales = project.signals.filter((s) => s.kind === "sale");
  const setup = project.signals.filter((s) => s.kind === "setup");
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={scoreVariant(project.score)}>{project.score}</Badge>
        <Link
          to="/p/$projectId"
          params={{ projectId: project.projectId }}
          className="font-medium hover:underline"
        >
          {project.name}
        </Link>
        {project.domain ? (
          <span className="text-sm text-muted-foreground">
            {project.domain}
          </span>
        ) : null}
      </div>
      {project.services.length ? (
        <div className="flex flex-wrap gap-1.5">
          {project.services.map((service) => (
            <Badge key={service} variant="soft">
              {service}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin oportunidades detectadas con los datos actuales.
        </p>
      )}
      {sales.length ? (
        <ul className="space-y-1.5 text-sm">
          {sales.map((signal) => (
            <li key={signal.id}>
              <span className="font-medium">{signal.title}</span>
              <span className="text-muted-foreground">
                {" "}
                · +{signal.weight} · {signal.evidence}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {setup.length ? (
        <p className="text-xs text-muted-foreground">
          Por configurar: {setup.map((s) => s.title).join(" · ")}
        </p>
      ) : null}
    </li>
  );
}

function SalesRadarPage() {
  const radarQuery = useQuery(salesRadarQueryOptions());
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Radar de ventas"
          description="Proyectos ordenados por lo que se les puede ofrecer, a partir del seguimiento de posiciones, Google Maps, auditorías y visibilidad en IA. No gasta créditos."
        />
        <QueryState
          query={radarQuery}
          errorFallback="No se pudo cargar el radar"
        >
          {(projects) =>
            projects.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {projects.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay proyectos.
              </p>
            )
          }
        </QueryState>
      </div>
    </div>
  );
}

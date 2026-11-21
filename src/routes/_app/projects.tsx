import * as React from "react";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteArchivedProject,
  getArchivedProjects,
  restoreProject,
} from "@/serverFunctions/projects";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { PageHeader, SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { getLastProjectId } from "@/client/lib/active-project";
import { CreateProjectModal } from "@/client/features/projects/CreateProjectModal";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/projects")({
  head: () => pageHead("Proyectos"),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [creating, setCreating] = React.useState(false);
  // Read after mount to keep SSR/first render stable.
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    setCurrentProjectId(getLastProjectId());
  }, []);
  const projectsQuery = useQuery(projectsQueryOptions());

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Proyectos"
          description="Cada proyecto tiene su propio Search Console, seguimiento de posiciones y auditorías."
          actions={
            <Button onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              Nuevo proyecto
            </Button>
          }
        />

        <QueryState
          query={projectsQuery}
          errorFallback="No se han podido cargar los proyectos"
        >
          {(data) => (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {data.map((project) => (
                <li key={project.id}>
                  <Link
                    to="/p/$projectId/settings"
                    params={{ projectId: project.id }}
                    className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {project.name}
                        </span>
                        {project.id === currentProjectId ? (
                          <Badge variant="secondary" size="sm">
                            Actual
                          </Badge>
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {project.domain ?? "Sin dominio"}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>

        <ArchivedProjects />
      </div>

      {creating ? (
        <CreateProjectModal onClose={() => setCreating(false)} />
      ) : null}
    </div>
  );
}

function ArchivedProjects() {
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["projects", "archived"],
    queryFn: () => getArchivedProjects(),
  });
  const archived = archivedQuery.data ?? [];

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) =>
      restoreProject({ data: { archivedProjectId: projectId } }),
    onSuccess: async () => {
      // Prefix match invalidates both the active and archived lists.
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      toast.success("Proyecto restaurado");
    },
  });

  const [deleting, setDeleting] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (projectId: string) =>
      deleteArchivedProject({ data: { archivedProjectId: projectId } }),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({
        queryKey: ["projects", "archived"],
      });
      toast.success("Proyecto eliminado");
    },
  });

  if (archived.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Archivados" />
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {archived.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 p-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-muted-foreground">
                {project.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {project.domain ?? "Sin dominio"}
              </span>
            </span>
            <span className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => restoreMutation.mutate(project.id)}
                disabled={restoreMutation.isPending}
              >
                Restaurar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleting(project)}
              >
                Eliminar
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {deleting ? (
        <ConfirmDialog
          title={`¿Eliminar \u201c${deleting.name}\u201d para siempre?`}
          confirmLabel="Eliminar para siempre"
          destructive
          pending={deleteMutation.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        >
          Se eliminará el proyecto y todos sus datos: auditorías, seguimiento de
          posiciones, palabras guardadas, informes, visibilidad en IA y chats.
          No se puede deshacer.
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

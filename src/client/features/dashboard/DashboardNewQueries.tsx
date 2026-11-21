import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Tag } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { QueryState } from "@/client/components/QueryState";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/client/components/ui/table";
import { getDashboardEmergingQueries } from "@/serverFunctions/dashboard";
import { Freshness, DashboardInfo } from "./siteTabParts";
import { cardTableClass, moreDetailsClass } from "./cardParts";

export function DashboardNewQueries({
  projectId,
  connected,
  siteUrl,
}: {
  projectId: string;
  connected: boolean;
  siteUrl: string | null;
}) {
  const query = useQuery({
    queryKey: ["dashboardEmergingQueries", projectId, siteUrl],
    queryFn: () => getDashboardEmergingQueries({ data: { projectId } }),
    enabled: connected,
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!connected) return null;
  return (
    <QueryState
      query={query}
      errorFallback="No se han podido cargar las palabras clave nuevas"
    >
      {(data) =>
        !data.value.connected ? (
          <GoogleConnectionCard
            provider="gsc"
            projectId={projectId}
            prominent
          />
        ) : (
          <CardShell
            title="Palabras clave nuevas"
            icon={<Tag className="size-5" />}
            titleInfo={
              <DashboardInfo label="Sobre las palabras clave nuevas">
                <p>
                  Búsquedas en las que tu sitio web ha aparecido hace poco en
                  Google.
                </p>
                <p className="mt-2">
                  Las vimos en la última semana de datos de Search Console, pero
                  no en las cuatro semanas anteriores.
                </p>
              </DashboardInfo>
            }
            action={
              <Link
                to="/p/$projectId"
                params={{ projectId }}
                search={{ tab: "keywords" }}
                className={moreDetailsClass}
                aria-label="Ver todas las palabras clave nuevas"
              >
                Ver todas
              </Link>
            }
          >
            <Freshness {...data} />
            {data.value.rows.length ? (
              <Table className={cardTableClass}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palabra clave</TableHead>
                    <TableHead className="text-right">Impresiones</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.value.rows.slice(0, 5).map((row) => (
                    <TableRow key={row.query}>
                      <TableCell className="font-medium">{row.query}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.impressions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.clicks.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                variant="plain"
                icon={Search}
                title={
                  data.value.hasSearchData
                    ? "No hay palabras clave nuevas esta semana"
                    : "Aún no hay datos de búsqueda"
                }
                description={
                  data.value.hasSearchData
                    ? "Tus consultas actuales pueden seguir ganando clics. Mira cómo están funcionando."
                    : "Google aún no ha registrado búsquedas de tu sitio web. Revisa la propiedad conectada en Search Console."
                }
                action={
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        to="/p/$projectId/search-performance"
                        params={{ projectId }}
                      />
                    }
                  >
                    Ver Search Console completo
                  </Button>
                }
              />
            )}
          </CardShell>
        )
      }
    </QueryState>
  );
}

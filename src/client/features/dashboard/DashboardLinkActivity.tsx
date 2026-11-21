import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/client/components/ui/table";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { QueryState } from "@/client/components/QueryState";
import { getDashboardLinkActivity } from "@/serverFunctions/dashboard";
import { DashboardInfo, ExternalPage, Freshness } from "./siteTabParts";
import { cardTableClass, moreDetailsClass } from "./cardParts";
export function DashboardLinkActivity({
  projectId,
  domain,
}: {
  projectId: string;
  domain: string;
}) {
  const query = useQuery({
    queryKey: ["dashboardLinkActivity", projectId, domain],
    queryFn: () => getDashboardLinkActivity({ data: { projectId } }),
    staleTime: 86400_000,
    retry: false,
  });
  return (
    <QueryState
      query={query}
      errorFallback="No se han podido cargar los enlaces nuevos"
    >
      {(data) => (
        <CardShell
          title="Enlaces entrantes nuevos"
          icon={<Link2 className="size-5" />}
          titleInfo={
            <DashboardInfo label="Sobre los enlaces nuevos">
              <p>
                Enlaces a tu sitio web encontrados en la última semana.
                Mostramos primero los sitios que te enlazan por primera vez.
              </p>
              <p className="mt-2">
                Un enlace puede ser anterior a la fecha en que se encontró.
              </p>
            </DashboardInfo>
          }
          action={
            <Link
              to="/p/$projectId"
              params={{ projectId }}
              search={{ tab: "backlinks" }}
              className={moreDetailsClass}
              aria-label="Ver todos los enlaces entrantes nuevos"
            >
              Ver todos
            </Link>
          }
        >
          <Freshness {...data} />
          {data.value.length ? (
            <Table className={cardTableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead>Dominio de referencia</TableHead>
                  <TableHead className="text-right">
                    Enlaces entrantes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.value.slice(0, 5).map((row, index) => (
                  <TableRow key={row.domain ?? index}>
                    <TableCell className="font-medium">
                      <ExternalPage
                        url={row.domain ? `https://${row.domain}` : null}
                        label={row.domain}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.backlinks?.toLocaleString() ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : data.links.length ? (
            <Table className={cardTableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead>Página de referencia</TableHead>
                  <TableHead>Texto ancla</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.links.slice(0, 5).map((row, index) => (
                  <TableRow key={`${row.urlFrom}:${index}`}>
                    <TableCell>
                      <ExternalPage url={row.urlFrom} label={row.domainFrom} />
                    </TableCell>
                    <TableCell
                      className="max-w-48 truncate"
                      title={row.anchor ?? undefined}
                    >
                      {row.anchor || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="plain"
              icon={Link2}
              title="No hay enlaces nuevos esta semana"
              description="Explora los sitios que ya te enlazan."
              action={
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      to="/p/$projectId"
                      params={{ projectId }}
                      search={{ tab: "backlinks" }}
                    />
                  }
                >
                  Ver enlaces entrantes
                </Button>
              }
            />
          )}
        </CardShell>
      )}
    </QueryState>
  );
}

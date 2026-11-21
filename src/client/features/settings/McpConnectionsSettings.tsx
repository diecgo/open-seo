import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { useOrganizations } from "@/client/features/settings/useOrganizations";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  listMcpConnections,
  revokeMcpConnection,
} from "@/serverFunctions/mcp-connections";

type McpConnection = Awaited<ReturnType<typeof listMcpConnections>>[number];

export function McpConnectionsSettings() {
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState<McpConnection | null>(
    null,
  );
  const { hasMultiple: showOrganization, organizationName } =
    useOrganizations();

  const connectionsQuery = useQuery({
    queryKey: ["mcpConnections"],
    queryFn: () => listMcpConnections(),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connection: McpConnection) =>
      revokeMcpConnection({
        data:
          connection.kind === "oauth"
            ? { kind: "oauth", grantId: connection.id }
            : {
                kind: "stripe",
                organizationId: connection.organizationId,
                stripeAccountId: connection.stripeAccountId,
              },
      }),
    onSuccess: (_, connection) => {
      captureClientEvent("mcp:connection_revoked", { kind: connection.kind });
      toast.success("Agente desconectado");
      setDisconnecting(null);
      void queryClient.invalidateQueries({ queryKey: ["mcpConnections"] });
    },
  });

  return (
    <section className="space-y-3">
      <SectionHeader title="Agentes conectados" />
      <p className="text-sm">
        Clientes de IA que han iniciado sesión en OpenSEO con OAuth o se han
        añadido con Stripe Projects.
      </p>

      <QueryState
        query={connectionsQuery}
        errorFallback="No hemos podido cargar tus agentes conectados."
      >
        {(connections) =>
          connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay agentes conectados.
            </p>
          ) : (
            <TableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    {showOrganization ? (
                      <TableHead>Organización</TableHead>
                    ) : null}
                    <TableHead>Conectado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {connection.clientName}
                      </TableCell>
                      {showOrganization ? (
                        <TableCell className="text-xs text-muted-foreground">
                          {organizationName(connection.organizationId) ?? "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <RowActionsMenu
                          label={`Acciones de ${connection.clientName}`}
                        >
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDisconnecting(connection)}
                          >
                            <Unplug />
                            Desconectar
                          </DropdownMenuItem>
                        </RowActionsMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )
        }
      </QueryState>

      {disconnecting ? (
        <ConfirmDialog
          title={`¿Desconectar “${disconnecting.clientName}”?`}
          confirmLabel="Desconectar"
          destructive
          pending={disconnectMutation.isPending}
          onClose={() => setDisconnecting(null)}
          onConfirm={() => disconnectMutation.mutate(disconnecting)}
        >
          {disconnecting.kind === "oauth"
            ? "Tendrá que volver a iniciar sesión en OpenSEO."
            : "Stripe no podrá crear claves nuevas y las que creó dejarán de funcionar. Ejecuta stripe projects add openseo/api para volver a conectarlo."}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

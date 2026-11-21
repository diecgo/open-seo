import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { usesBetterAuthClient } from "@/lib/auth-mode";
import {
  getWorkspaceMergeStatus,
  mergeLegacyWorkspaces,
} from "@/serverFunctions/workspace";

// Shown on self-hosted Cloudflare Access deployments that still have per-user
// workspaces from before the shared workspace existed. The server decides
// visibility (AUTH_MODE is a runtime var there); hosted builds skip the query
// entirely since the mode is known at build time.
export function WorkspaceMergeBanner() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["workspaceMergeStatus"],
    queryFn: () => getWorkspaceMergeStatus(),
    enabled: !usesBetterAuthClient(),
  });

  const mergeMutation = useMutation({
    mutationFn: () => mergeLegacyWorkspaces(),
    onSuccess: ({ mergedWorkspaces }) => {
      toast.success(
        `${mergedWorkspaces === 1 ? "Se ha migrado 1 organización" : `Se han migrado ${mergedWorkspaces} organizaciones`} a la organización compartida.`,
      );
      // The merge changes projects, connections, and the banner's own status —
      // refetch everything rather than enumerating keys.
      void queryClient.invalidateQueries();
    },
  });

  if (!statusQuery.data || statusQuery.data.legacyWorkspaceCount === 0) {
    return null;
  }

  return (
    <Alert variant="warning" className="p-5">
      <AlertDescription className="max-w-3xl text-foreground">
        En las instalaciones propias en Cloudflare había un error por el que
        cada usuario tenía su propio espacio de trabajo. La idea era que todos
        los usuarios compartieran uno. Al pulsar el botón de abajo se migrará el
        trabajo anterior de todos a este espacio de trabajo compartido.
      </AlertDescription>
      <Button
        size="sm"
        className="mt-4 justify-self-start"
        pending={mergeMutation.isPending}
        onClick={() => mergeMutation.mutate()}
      >
        {mergeMutation.isPending ? "Migrando…" : "Migrar organizaciones"}
      </Button>
    </Alert>
  );
}

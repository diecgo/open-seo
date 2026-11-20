import { createServerFn } from "@tanstack/react-start";
import { SalesRadarService } from "@/server/features/sales-radar/SalesRadarService";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSalesRadar = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    SalesRadarService.getSalesRadar(context.organizationId),
  );

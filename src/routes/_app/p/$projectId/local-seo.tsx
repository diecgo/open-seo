import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { pageHead } from "@/client/lib/pageHead";
import leafletCss from "leaflet/dist/leaflet.css?url";
import localRankMapCss from "@/client/features/local-seo/local-rank-map.css?url";

export const Route = createFileRoute("/_app/p/$projectId/local-seo")({
  head: () => ({
    ...pageHead("SEO local"),
    links: [
      { rel: "stylesheet", href: leafletCss },
      { rel: "stylesheet", href: localRankMapCss },
    ],
  }),
  component: LocalSeoLayout,
});
function LocalSeoLayout() {
  const { projectId, trackerId } = useParams({ strict: false });
  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title="SEO local"
          description="Sigue tu posición en Google Maps en tu zona"
          backLink={
            projectId && trackerId ? (
              <BackLink to="/p/$projectId/local-seo" params={{ projectId }}>
                Negocios seguidos
              </BackLink>
            ) : undefined
          }
        />
        <Outlet />
      </div>
    </div>
  );
}

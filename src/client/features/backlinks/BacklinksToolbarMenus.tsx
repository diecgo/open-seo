import { ChevronDown, Gauge, Link2, MoreHorizontal } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Spinner } from "@/client/components/ui/spinner";
import { DEFAULT_BACKLINKS_SPAM_THRESHOLD } from "@/types/schemas/backlinks";

export function BacklinksBestLinksMenu({
  hideSpam,
  onHideSpamChange,
}: {
  hideSpam: boolean;
  onHideSpamChange: (hideSpam: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <Link2 data-icon="inline-start" />
        Mejores enlaces: {hideSpam ? "Sí" : "No"}
        <ChevronDown data-icon="inline-end" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuRadioGroup
          value={hideSpam ? "best" : "all"}
          onValueChange={(value) => onHideSpamChange(value === "best")}
        >
          <DropdownMenuRadioItem value="best">
            <span>
              <span className="block">Solo los mejores enlaces</span>
              <span className="block text-xs text-muted-foreground">
                Puntuación inferior a {DEFAULT_BACKLINKS_SPAM_THRESHOLD} o
                desconocida
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all">
            <span>
              <span className="block">
                Todos los enlaces (incluidos los de spam)
              </span>
              <span className="block text-xs text-muted-foreground">
                Incluye puntuaciones de {DEFAULT_BACKLINKS_SPAM_THRESHOLD} o más
              </span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BacklinksActionsMenu({
  isLoadingRatings,
  loadRatings,
  ratableDomains,
}: {
  isLoadingRatings: boolean;
  loadRatings: (domains: string[]) => void | Promise<void>;
  ratableDomains: string[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones de la tabla de enlaces entrantes"
            title="Acciones de la tabla de enlaces entrantes"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => void loadRatings(ratableDomains)}
          disabled={isLoadingRatings}
          title="Consulta el Domain Rating de Ahrefs de cada dominio de la tabla"
        >
          {isLoadingRatings ? <Spinner /> : <Gauge />}
          Ahrefs DR
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

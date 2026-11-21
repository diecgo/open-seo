import { LayoutTemplate, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
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
import { formatRelativeTime } from "@/client/lib/relative-time";
import type { ReportTemplate } from "@/types/schemas/report-templates";

export function ReportTemplatesList({
  templates,
  onEdit,
  onDelete,
}: {
  templates: ReportTemplate[];
  onEdit: (template: ReportTemplate) => void;
  onDelete: (template: ReportTemplate) => void;
}) {
  if (templates.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="Aún no hay plantillas"
        description="Una plantilla es un briefing reutilizable para un tipo de informe: para quién es, qué secciones tiene y qué tono usa."
      />
    );
  }

  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Actualizada</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <button
                  type="button"
                  className="text-left font-medium hover:underline"
                  onClick={() => onEdit(template)}
                >
                  {template.name}
                </button>
              </TableCell>
              <TableCell className="max-w-[420px] text-muted-foreground">
                {template.description}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelativeTime(template.updatedAt)}
              </TableCell>
              <TableCell className="w-10 text-right">
                <RowActionsMenu label={`Acciones de ${template.name}`}>
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(template)}
                  >
                    <Trash2 />
                    Eliminar
                  </DropdownMenuItem>
                </RowActionsMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}

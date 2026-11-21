import { revalidateLogic } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { captureClientEvent } from "@/client/lib/posthog";
import { saveReportTemplate } from "@/serverFunctions/reportTemplates";
import type { ReportTemplate } from "@/types/schemas/report-templates";

// One form for create and edit. Shape only, as at every other boundary: the
// caps come back from the service with their copy and show in a toast.
const formSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la plantilla."),
  description: z
    .string()
    .trim()
    .min(1, "Indica en una línea cuándo usar esta plantilla."),
  instructions: z
    .string()
    .trim()
    .min(1, "Indica para quién es el informe y qué secciones tiene."),
});

const INSTRUCTIONS_PLACEHOLDER = `Público: responsable de marketing del cliente, sin perfil técnico.
Secciones, en orden: Dónde estamos / Qué hicimos este mes / Qué se movió / Qué esperar.
Tono: claro y seguro. Explica cada término SEO. Sin exclamaciones.
Firma como: Acme SEO
Color de acento: #1C4ED8`;

export function ReportTemplateForm({
  projectId,
  template,
  onClose,
  onSaved,
}: {
  projectId: string;
  /** The template being edited, or undefined when creating one. */
  template?: ReportTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveMutation = useMutation({
    // A refusal (duplicate name, the cap) comes back as `{ ok: false }` rather
    // than an error, because thrown errors reach the client stripped to their
    // code. Rethrowing it here lets the mutation cache toast its message.
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const result = await saveReportTemplate({
        data: { projectId, templateId: template?.id, ...values },
      });
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      captureClientEvent("report_template:saved", {
        project_id: projectId,
        is_update: !result.created,
        source: "app",
      });
      toast.success(result.created ? "Plantilla creada" : "Plantilla guardada");
      onSaved();
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      instructions: template?.instructions ?? "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: ({ value }) => saveMutation.mutateAsync(value),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {template ? "Editar plantilla" : "Nueva plantilla"}
              </DialogTitle>
            </DialogHeader>

            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Nombre"
                  placeholder="Revisión mensual del cliente"
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label="Descripción"
                  description="Una línea que diga cuándo usarla. Es lo que lee un agente para decidir."
                  placeholder="La actualización mensual que enviamos a los clientes con cuota fija."
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="instructions">
              {(field) => (
                <field.TextareaField
                  label="Instrucciones"
                  description="La voz de marca de todo el proyecto está en Contexto › Preferencias de redacción."
                  className="h-56 font-mono leading-relaxed md:text-xs"
                  placeholder={INSTRUCTIONS_PLACEHOLDER}
                  required
                />
              )}
            </form.AppField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                Cancelar
              </Button>
              <form.SubmitButton>
                {template ? "Guardar cambios" : "Crear plantilla"}
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormDialog } from "@/client/components/FormDialog";
import {
  cleanKeywords,
  KeywordFields,
} from "@/client/components/KeywordFields";
import {
  MAX_LOCAL_KEYWORD_LENGTH,
  MAX_LOCAL_KEYWORDS,
} from "@/types/schemas/local-seo";
import { useAppForm } from "@/client/components/form/useAppForm";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { updateLocalKeywords } from "@/serverFunctions/local-seo";

export function LocalKeywordsDialog({
  projectId,
  trackerId,
  keywords,
  onClose,
}: {
  projectId: string;
  trackerId: string;
  keywords: { keyword: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (terms: string[]) =>
      updateLocalKeywords({ data: { projectId, trackerId, keywords: terms } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["localSeo", projectId],
      });
      onClose();
    },
  });
  const form = useAppForm({
    defaultValues: {
      keywords: keywords.length ? keywords.map((row) => row.keyword) : [""],
    },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(cleanKeywords(value.keywords));
    },
  });
  return (
    <FormDialog
      title="Gestionar palabras clave"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" disabled={save.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="local-keywords" pending={save.isPending}>
            Guardar palabras clave
          </Button>
        </>
      }
    >
      <form.AppForm>
        <form.Form id="local-keywords" className="space-y-4">
          <form.Field name="keywords">
            {(field) => (
              <KeywordFields
                label="Palabras clave que seguir"
                placeholder="p. ej. pizza a domicilio"
                max={MAX_LOCAL_KEYWORDS}
                maxLength={MAX_LOCAL_KEYWORD_LENGTH}
                value={field.state.value}
                onChange={field.handleChange}
                description="Cada comprobación busca todas las palabras clave en todos los puntos. Los resultados de las palabras clave quitadas se conservan."
              />
            )}
          </form.Field>
        </form.Form>
      </form.AppForm>
      {save.isError && (
        <QueryError
          error={save.error}
          fallback="No se han podido guardar estas palabras clave."
        />
      )}
    </FormDialog>
  );
}

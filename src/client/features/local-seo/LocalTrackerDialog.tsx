import { lazy, Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import {
  cleanKeywords,
  KeywordFields,
} from "@/client/components/KeywordFields";
import {
  MAX_LOCAL_KEYWORD_LENGTH,
  MAX_LOCAL_KEYWORDS,
} from "@/types/schemas/local-seo";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { QueryError } from "@/client/components/QueryState";
import {
  createLocalTracker,
  lookupLocalBusiness,
} from "@/serverFunctions/local-seo";
import { SerpLocationCombobox } from "@/client/components/SerpLocationCombobox";
import { usePrewarmSerpLocations } from "@/client/components/usePrewarmSerpLocations";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { useProjectMarket } from "@/client/features/projects/useProjectMarket";
import { getIsoCountryCode } from "@/shared/keyword-locations";
import { LocalListingChoices, type Listing } from "./LocalListingChoices";
import { LOCAL_AREA_ITEMS, LOCAL_AREAS, type LocalArea } from "./localAreas";
import { LocalCenterField } from "./LocalCenterField";

const ListingMap = lazy(() => import("./LocalListingMap"));

export function LocalTrackerDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [listing, setListing] = useState<Listing | null>(null);
  return listing ? (
    <TrackerSettings
      projectId={projectId}
      listing={listing}
      onClose={onClose}
      onCreated={onCreated}
    />
  ) : (
    <ListingLookup
      projectId={projectId}
      onClose={onClose}
      onSelect={setListing}
    />
  );
}

function ListingLookup({
  projectId,
  onClose,
  onSelect,
}: {
  projectId: string;
  onClose: () => void;
  onSelect: (listing: Listing) => void;
}) {
  const market = useProjectMarket(projectId);
  const countryCode = market ? getIsoCountryCode(market.locationCode) : "us";
  usePrewarmSerpLocations(countryCode, Boolean(market));
  const [selected, setSelected] = useState(0);
  const lookup = useMutation({
    mutationFn: (data: { query: string; locationName: string }) =>
      lookupLocalBusiness({ data: { projectId, ...data } }),
    // A single match needs no picking, so setup opens straight away.
    onSuccess: (found) => {
      setSelected(0);
      if (found.length === 1) onSelect(found[0]);
    },
  });
  const form = useAppForm({
    defaultValues: { query: "", locationName: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: z.object({
        query: z
          .string()
          .trim()
          .min(2, "Escribe el nombre del negocio.")
          .max(200),
        locationName: z
          .string()
          .min(1, "Elige la ciudad donde está el negocio."),
      }),
    },
    onSubmit: async ({ value }) => {
      await lookup.mutateAsync(value);
    },
  });
  const listings = lookup.data && lookup.data.length > 1 ? lookup.data : null;
  return (
    <FormDialog
      title="Añadir negocio"
      onClose={onClose}
      wide={Boolean(listings)}
      actions={
        listings ? (
          <>
            <Button variant="outline" onClick={() => lookup.reset()}>
              Buscar de nuevo
            </Button>
            <Button onClick={() => onSelect(listings[selected])}>
              Usar esta ficha
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="local-business-lookup"
              pending={lookup.isPending}
            >
              Buscar ficha
            </Button>
          </>
        )
      }
    >
      {listings ? (
        <div className="grid gap-4 md:grid-cols-2">
          <LocalListingChoices
            listings={listings}
            selected={selected}
            onSelectedChange={setSelected}
          />
          <div className="min-h-80 overflow-hidden rounded-lg border border-border">
            <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
              <ListingMap
                projectId={projectId}
                listings={listings}
                selected={selected}
                onSelectedChange={setSelected}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <form.AppForm>
          <form.Form id="local-business-lookup" className="space-y-4">
            <form.AppField name="query">
              {(field) => (
                <field.TextField
                  label="Nombre del negocio"
                  placeholder="p. ej. Pizzería Joe"
                />
              )}
            </form.AppField>
            <form.Field name="locationName">
              {(field) => {
                const error = field.state.meta.errors[0]?.message;
                return (
                  <Field data-invalid={Boolean(error) || undefined}>
                    <FieldLabel htmlFor="local-business-city">
                      Ciudad
                    </FieldLabel>
                    <SerpLocationCombobox
                      id="local-business-city"
                      value={field.state.value || undefined}
                      onChange={(value) => field.handleChange(value ?? "")}
                      countryCode={countryCode}
                      invalid={Boolean(error)}
                    />
                    {error ? <FieldError>{error}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>
          </form.Form>
        </form.AppForm>
      )}
      {lookup.isPending && (
        <p className="text-sm text-muted-foreground">
          Buscando en Google Maps. Suele tardar unos segundos.
        </p>
      )}
      {lookup.isError && (
        <QueryError
          title="No se ha podido buscar este negocio"
          cause={lookup.error}
          fallback="Vuelve a intentarlo en un momento."
        />
      )}
      {lookup.isSuccess && lookup.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No se ha encontrado ninguna ficha de Google Maps. Comprueba que el
          nombre coincide con la ficha y que la ciudad es correcta.
        </p>
      )}
    </FormDialog>
  );
}

function TrackerSettings({
  projectId,
  listing,
  onClose,
  onCreated,
}: {
  projectId: string;
  listing: Listing;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { business, suggestedKeywords } = listing;
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createLocalTracker>[0]["data"]) =>
      createLocalTracker({ data: input }),
    onSuccess: (tracker) => {
      void queryClient.invalidateQueries({ queryKey: ["localSeo", projectId] });
      onCreated(tracker.id);
    },
  });
  const form = useAppForm({
    defaultValues: {
      keywords: suggestedKeywords.length ? suggestedKeywords : [""],
      area: "town" as LocalArea,
      center: { latitude: business.latitude, longitude: business.longitude },
    },
    onSubmit: async ({ value }) => {
      const area = LOCAL_AREAS[value.area];
      await create.mutateAsync({
        projectId,
        // The tracker's coordinates are the grid's center.
        business: { ...business, ...value.center },
        keywords: cleanKeywords(value.keywords),
        gridSize: area.gridSize,
        spacingKm: area.spacingKm,
      });
    },
  });
  return (
    <FormDialog
      title="Configurar seguimiento local"
      onClose={onClose}
      actions={
        <>
          <Button
            variant="outline"
            disabled={create.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="local-tracker-settings"
            pending={create.isPending}
          >
            Guardar negocio
          </Button>
        </>
      }
    >
      <div>
        <p className="text-sm font-medium">{business.title}</p>
        <p className="text-sm text-muted-foreground">{business.address}</p>
      </div>
      <form.AppForm>
        <form.Form id="local-tracker-settings" className="space-y-4">
          <form.Field name="keywords">
            {(field) => (
              <KeywordFields
                label="Palabras clave que seguir"
                placeholder="p. ej. pizza a domicilio"
                max={MAX_LOCAL_KEYWORDS}
                maxLength={MAX_LOCAL_KEYWORD_LENGTH}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.AppField name="area">
            {(field) => (
              <field.SelectField
                label="Zona que comprobar"
                description="Buscamos en Google Maps desde puntos repartidos por esta zona."
                items={LOCAL_AREA_ITEMS}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.area}>
            {(area) => (
              <form.Field name="center">
                {(field) => (
                  <LocalCenterField
                    projectId={projectId}
                    center={field.state.value}
                    grid={LOCAL_AREAS[area]}
                    onChange={field.handleChange}
                    note={
                      business.address
                        ? undefined
                        : "La ficha seleccionada no tiene dirección pública, así que la ubicación de Google puede ser distinta."
                    }
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </form.Form>
      </form.AppForm>
      {create.isError && (
        <QueryError
          error={create.error}
          fallback="No se ha podido guardar este negocio."
        />
      )}
    </FormDialog>
  );
}

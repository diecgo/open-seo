import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { Download, ReceiptText } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { buttonVariants } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Switch } from "@/client/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { billingAccountQueryOptions } from "@/client/features/billing/billingAccountQuery";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { queryClient } from "@/client/tanstack-db";
import {
  listBillingInvoices,
  setInvoiceEmails,
} from "@/serverFunctions/billing";

const dateFormat: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

function formatDate(epochMs: number) {
  return new Date(epochMs).toLocaleDateString(undefined, dateFormat);
}

function formatAmount(total: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(total);
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "borrador",
  open: "pendiente",
  paid: "pagada",
  uncollectible: "incobrable",
  void: "anulada",
};

const invoicesQueryOptions = queryOptions({
  queryKey: ["billing", "invoices"],
  queryFn: () => listBillingInvoices(),
});

/** Invoice emails and the newest invoices, the billing Invoices tab.
 *  Owner-only at the call site, as the server enforces: invoices show the
 *  billing address. */
export function BillingInvoices({
  invoiceEmailsEnabled,
}: {
  invoiceEmailsEnabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <InvoiceEmailsToggle invoiceEmailsEnabled={invoiceEmailsEnabled} />
      <InvoiceTable />
    </div>
  );
}

function InvoiceEmailsToggle({
  invoiceEmailsEnabled,
}: {
  invoiceEmailsEnabled: boolean;
}) {
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setInvoiceEmails({ data: { enabled } }),
    // The error shows inline under the switch.
    meta: { errorToast: false },
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(billingAccountQueryOptions().queryKey, (prev) =>
        prev ? { ...prev, invoiceEmailsEnabled: enabled } : prev,
      );
    },
  });

  const checked = mutation.isPending
    ? mutation.variables
    : invoiceEmailsEnabled;

  return (
    <Field>
      <div className="flex items-center gap-2">
        <Switch
          id="billing-invoice-emails"
          checked={checked}
          disabled={mutation.isPending}
          onCheckedChange={(enabled) => mutation.mutate(enabled)}
        />
        <FieldLabel htmlFor="billing-invoice-emails">
          Enviarme un recibo por email de cada factura
        </FieldLabel>
      </div>
      <FieldDescription>
        Stripe envía el recibo al email de facturación de tu cuenta después de
        cada pago.
      </FieldDescription>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getStandardErrorMessage(
            mutation.error,
            "No hemos podido guardar este ajuste. Vuelve a intentarlo.",
          )}
        </p>
      ) : null}
    </Field>
  );
}

function InvoiceTable() {
  const invoicesQuery = useQuery(invoicesQueryOptions);

  if (invoicesQuery.isPending) {
    return (
      <div aria-busy className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (invoicesQuery.isError) {
    return (
      <QueryError
        error={invoicesQuery.error}
        fallback="No hemos podido cargar tus facturas. Vuelve a intentarlo."
        onRetry={() => void invoicesQuery.refetch()}
        isRetrying={invoicesQuery.isFetching}
      />
    );
  }

  const { invoices, hasMore } = invoicesQuery.data;

  if (invoices.length === 0) {
    return (
      <EmptyState
        variant="plain"
        icon={ReceiptText}
        title="Aún no hay facturas"
        description="Aquí aparecerán las facturas de tu plan y de tus compras de créditos."
      />
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Factura</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Periodo de facturación</TableHead>
            <TableHead>Importe</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Descargar</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                {invoice.number ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(invoice.createdAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {invoice.periodStart !== null && invoice.periodEnd !== null
                  ? `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`
                  : "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatAmount(invoice.total, invoice.currency)}
              </TableCell>
              <TableCell className="capitalize">
                {INVOICE_STATUS_LABELS[invoice.status ?? ""] ?? invoice.status}
              </TableCell>
              <TableCell className="text-right">
                {invoice.pdfUrl ? (
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                    aria-label={`Descargar PDF de ${invoice.number ?? "la factura"}`}
                  >
                    <Download />
                    PDF
                  </a>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore ? (
        <p className="text-xs text-muted-foreground">
          Se muestran tus facturas más recientes. Encontrarás las anteriores en
          Gestionar suscripción.
        </p>
      ) : null}
    </div>
  );
}

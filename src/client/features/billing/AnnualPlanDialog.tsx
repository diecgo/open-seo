import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { SUPPORT_EMAIL } from "@/client/lib/support";

// Checkout sells the yearly plans to organizations without a plan. A monthly
// subscriber who picks one on /subscribe is sent to support, who credit what
// is left of the month they paid for.
export function AnnualPlanDialog({
  open,
  onOpenChange,
  planName,
  annualPriceUsd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  annualPriceUsd: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            De momento, el cambio a anual se gestiona por email
          </DialogTitle>
          <DialogDescription>
            Escribe a {SUPPORT_EMAIL} y te pasaremos al {planName} por $
            {annualPriceUsd.toLocaleString()}/año. Te descontaremos lo que quede
            de tu mes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            nativeButton={false}
            render={
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  `${planName} anual`,
                )}`}
              />
            }
          >
            Escríbenos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

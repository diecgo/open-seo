import { cn } from "cn";

/** Shown where a missing permission would otherwise leave a card or step empty. */
export function PermissionHint({
  action,
  className,
}: {
  action: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Solo un propietario o administrador de la organización puede {action}.
    </p>
  );
}

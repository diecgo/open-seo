import { Crown, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { Badge } from "@/client/components/ui/badge";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/client/components/ui/table";
import { hasOrgPermission } from "@/lib/org-permissions";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

function formatRole(role: string) {
  return role
    .split(",")
    .map((name) => ROLE_LABELS[name.trim()] ?? name.trim())
    .join(", ");
}

export type Member = {
  id: string;
  userId: string;
  role: string;
  user: { name?: string | null; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role?: string | null;
  expiresAt: Date | string;
};

export function MemberRow({
  member,
  isSelf,
  canManageTeam,
  isOwner,
  isRemoving,
  onRemove,
  onTransferOwnership,
}: {
  member: Member;
  isSelf: boolean;
  canManageTeam: boolean;
  isOwner: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  onTransferOwnership: () => void;
}) {
  const memberIsOwner = hasOrgPermission(member.role, {
    billing: ["manage"],
  });
  // Owners are protected server-side (only an owner can touch an owner; the
  // last owner can't be removed) — don't render controls that would just 403.
  const canRemove = canManageTeam && !isSelf && (!memberIsOwner || isOwner);
  // Owners can always remove, so this only ever adds to the remove menu.
  const canTransferOwnership = isOwner && !isSelf && !memberIsOwner;
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {member.user.name || member.user.email}
          {isSelf ? (
            <span className="font-normal text-muted-foreground"> (tú)</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground" data-ph-mask>
          {member.user.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{formatRole(member.role)}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">Activo</TableCell>
      <TableCell>
        {canRemove ? (
          <RowActionsMenu label={`Acciones de ${member.user.email}`}>
            {canTransferOwnership ? (
              <DropdownMenuItem onClick={onTransferOwnership}>
                <Crown />
                Transferir la propiedad
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              disabled={isRemoving}
              onClick={() => setIsConfirmingRemove(true)}
            >
              <Trash2 />
              Quitar miembro
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
        {isConfirmingRemove ? (
          <ConfirmDialog
            title={`¿Quitar a ${member.user.email} de esta organización?`}
            confirmLabel="Quitar miembro"
            destructive
            onClose={() => setIsConfirmingRemove(false)}
            onConfirm={() => {
              setIsConfirmingRemove(false);
              onRemove();
            }}
          >
            Perderá el acceso al momento. Se desconectarán las conexiones de
            Search Console y Google Analytics hechas con su cuenta de Google.
          </ConfirmDialog>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function InvitationRow({
  invitation,
  canManageTeam,
  isResending,
  isCanceling,
  onResend,
  onCancel,
}: {
  invitation: Invitation;
  canManageTeam: boolean;
  isResending: boolean;
  isCanceling: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {invitation.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {formatRole(invitation.role ?? "member")}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        Invitado &middot; caduca el{" "}
        {new Date(invitation.expiresAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {canManageTeam ? (
          <RowActionsMenu
            label={`Acciones de la invitación a ${invitation.email}`}
          >
            <DropdownMenuItem disabled={isResending} onClick={onResend}>
              <Send />
              Reenviar invitación
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isCanceling}
              onClick={onCancel}
            >
              <Trash2 />
              Cancelar invitación
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

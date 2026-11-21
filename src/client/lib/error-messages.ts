import { FREE_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { GATEWAY_RENDERING_NOT_SET_UP_MESSAGE } from "@/shared/audit-rendering";
import { isErrorCode, type ErrorCode } from "@/shared/error-codes";
import {
  isEveryAppClientAuthMode,
  isHostedClientAuthMode,
} from "@/lib/auth-mode";

/**
 * Copy for an error we did not expect. Hosted users cannot read our logs, so
 * they get support; a self-hoster runs the server and can.
 */
export const UNEXPECTED_ERROR_MESSAGE = isHostedClientAuthMode()
  ? "Algo ha fallado por nuestra parte. Vuelve a intentarlo y contacta con soporte si sigue pasando."
  : "Algo ha fallado. Vuelve a intentarlo o revisa los logs del servidor para ver los detalles.";

const STANDARD_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Inicia sesión y vuelve a intentarlo.",
  AUTH_CONFIG_MISSING: isEveryAppClientAuthMode()
    ? "Ahora mismo OpenSEO no puede conectar con tu gateway de Every App para esto. Un propietario o administrador puede revisar su configuración con pnpm everyapp status."
    : "La autenticación de OpenSEO no está configurada. Sigue los pasos del README para Cloudflare Access.",
  PAYMENT_REQUIRED: "Necesitas una suscripción activa para poder usar OpenSEO.",
  INSUFFICIENT_CREDITS:
    "No tienes créditos suficientes para esto. Mejora tu plan o compra más créditos para seguir.",
  PAYMENT_METHOD_REQUIRED:
    "No hemos podido cobrar en la tarjeta guardada. Añade o actualiza tu tarjeta en el portal de facturación y vuelve a intentarlo.",
  PAYMENT_ACTION_REQUIRED:
    "Tu banco necesita más tiempo o una confirmación para este cargo. Revisa tu saldo dentro de un minuto; si no ha llegado nada, compra tu primera recarga con el botón Comprar créditos y luego activa la recarga automática.",
  AUDIT_RENDERING_UNAVAILABLE: isEveryAppClientAuthMode()
    ? GATEWAY_RENDERING_NOT_SET_UP_MESSAGE
    : "El renderizado de JavaScript no está configurado en esta instalación. Pide a tu administrador que active un renderizador.",
  FORBIDDEN: "No tienes acceso a este recurso.",
  NOT_FOUND: "No se ha encontrado el recurso solicitado.",
  AUDIT_CAPACITY_REACHED:
    "Has alcanzado el límite de auditorías de tu cuenta. Elimina auditorías antiguas de tus proyectos para empezar una nueva.",
  AUDIT_PAGE_LIMIT_EXCEEDED: `Las auditorías del plan gratuito están limitadas a ${FREE_MAX_AUDIT_PAGES} páginas. Mejora tu plan para hacer auditorías más grandes.`,
  AUDIT_ALREADY_RUNNING:
    "Has alcanzado el límite de auditorías simultáneas. Espera a que termine una o elimínala antes de empezar otra.",
  VALIDATION_ERROR: "Revisa los datos introducidos y vuelve a intentarlo.",
  UNKNOWN_LOCATION:
    "No hemos encontrado esa ciudad, provincia o región. Elige una ubicación de la lista o vacía el campo para buscar en todo el país.",
  CRAWL_TARGET_BLOCKED:
    "La política de seguridad bloquea el rastreo de este destino.",
  BACKLINKS_BILLING_ISSUE:
    "La cuenta de DataForSEO conectada tiene un problema de facturación o de saldo.",
  AI_SEARCH_BILLING_ISSUE:
    "La cuenta de DataForSEO conectada tiene un problema de facturación o de saldo.",
  AI_VISIBILITY_ERROR:
    "No se ha podido completar la solicitud de visibilidad en IA. Revisa los ajustes de seguimiento y vuelve a intentarlo.",
  DATAFORSEO_AUTH_FAILED: isEveryAppClientAuthMode()
    ? "DataForSEO aún no está configurado en tu gateway de Every App o ha rechazado la clave guardada. Un propietario o administrador lo configura con pnpm everyapp secret set DATAFORSEO_API_KEY, o TREG_API_TOKEN para usar treg."
    : "DataForSEO ha rechazado las credenciales. Comprueba que DATAFORSEO_API_KEY es el base64 de tu login:password de DataForSEO y que la cuenta de DataForSEO está verificada y tiene acceso a la API. Si usas TREG_API_TOKEN, revisa el token y su saldo en treg.to.",
  RATE_LIMITED: "Demasiadas solicitudes. Espera un poco y vuelve a intentarlo.",
  UPSTREAM_UNAVAILABLE:
    "El proveedor de datos no está disponible temporalmente. Vuelve a intentarlo en un momento.",
  SUBREQUEST_LIMIT:
    "Cloudflare lo ha detenido al llegar a su límite de solicitudes por ejecución. Con Workers Paid, vuelve a desplegar OpenSEO para subirlo.",
  CONFLICT: "Esta solicitud entra en conflicto con datos existentes.",
  INTERNAL_ERROR: UNEXPECTED_ERROR_MESSAGE,
};

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = STANDARD_MESSAGES.INTERNAL_ERROR,
): string {
  if (!(error instanceof Error)) return fallback;
  if (isErrorCode(error.message)) return STANDARD_MESSAGES[error.message];
  if (error.message) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  return isErrorCode(error.message) ? error.message : null;
}

import { ACCOUNT_DELETION_SCHEDULED_ERROR } from "@/shared/account-deletion";
import { CHATGPT_EMAIL_NOT_VERIFIED_CODE } from "@/shared/chatgpt-sign-in";

/**
 * Plain-language copy for OAuth failures, shared by the connect-surface
 * inline alert (GoogleLinkErrorAlert) and the /auth-error fallback page.
 * `code` is the `error` query param on the redirect: the provider's own error
 * code (access_denied), or one set by googleOAuth.ts / Better Auth.
 *
 * `providerLabel` ("Search Console" / "Google Analytics") is set when the
 * failure came from a connect flow; without it the copy reads as a sign-in
 * failure. The error page can't tell a Google sign-in from a ChatGPT one, so
 * that copy names neither.
 */
export function googleAuthErrorCopy(
  code: string,
  providerLabel?: string,
): { title: string; description: string } {
  const what = providerLabel
    ? `La conexión con ${providerLabel}`
    : "El inicio de sesión";
  const provider = providerLabel
    ? "Google"
    : "el proveedor de inicio de sesión";

  switch (code) {
    case ACCOUNT_DELETION_SCHEDULED_ERROR:
      return {
        title: "Esta cuenta se está eliminando",
        description:
          "Nos pediste eliminar esta cuenta, así que no se puede iniciar sesión en ella. Para conservarla, escribe a support@openseo.so antes de la fecha de eliminación.",
      };
    // Sign-in with Google or ChatGPT reached an existing account it may not
    // be attached to: the provider hasn't verified the email, or the account
    // never confirmed its own.
    case "account_not_linked":
      return {
        title: "Este correo ya tiene una cuenta",
        description:
          "Inicia sesión como lo hiciste la otra vez. Si fue con correo y contraseña y nunca confirmaste tu correo, confírmalo primero.",
      };
    case CHATGPT_EMAIL_NOT_VERIFIED_CODE:
      return {
        title: "Verifica primero tu correo en ChatGPT",
        description:
          "OpenAI no ha verificado el correo de tu cuenta de ChatGPT, así que no podemos crear una cuenta de OpenSEO con él. Verifícalo en ChatGPT o regístrate con Google o con tu correo.",
      };
    case "state_mismatch":
      return {
        title: `${what} no se ha completado`,
        description:
          "El intento caducó o se interrumpió. Vuelve a intentarlo en una sola pestaña del navegador y termina los pasos en menos de 10 minutos. Si sigue pasando, comprueba que tu navegador permite cookies para este sitio.",
      };
    case "access_denied":
      return {
        title: `${what} se ha cancelado`,
        description:
          "La pantalla de permisos se cerró o se rechazó. Vuelve a intentarlo cuando quieras.",
      };
    case "scope_not_granted":
      return {
        title: `${what} no tiene todos los permisos`,
        description: `OpenSEO no ha obtenido acceso a tus datos de ${providerLabel ?? "Google"} porque no se marcó una casilla en la pantalla de permisos de Google. Vuelve a intentarlo y marca todas las casillas antes de continuar.`,
      };
    case "connection_save_failed":
      return {
        title: `${what} no se ha completado`,
        description:
          "No hemos podido guardar la conexión. Vuelve a intentarlo; si sigue fallando, contacta con soporte.",
      };
    default:
      return {
        title: `${what} no se ha completado`,
        description: `Algo ha fallado al comunicarnos con ${provider}. Vuelve a intentarlo; si sigue fallando, contacta con soporte.`,
      };
  }
}

import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";
const TREG_URL = "https://treg.to";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  head: () => pageHead("Clave API de DataForSEO"),
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  const requestStep = (
    <li>
      Ve a{" "}
      <a
        className={helpLinkClassName}
        href={DATAFORSEO_API_ACCESS_URL}
        target="_blank"
        rel="noreferrer"
      >
        Acceso a la API de DataForSEO
      </a>{" "}
      y pide credenciales de API por email.
    </li>
  );
  const encodeStep = (
    <li>
      Codifica en Base64 tu usuario de DataForSEO y la contraseña de la API con
      este formato:
      <CommandBlock command="printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64" />
    </li>
  );
  return (
    <SecretHelpPage
      title="Configura tu clave API de DataForSEO"
      intro={
        <>
          OpenSEO necesita el secreto <code>DATAFORSEO_API_KEY</code> para que
          funcionen las palabras clave, los dominios y los datos SEO.
        </>
      }
      everyAppIntro="Los datos de palabras clave, dominios, enlaces entrantes y posiciones de OpenSEO vienen de DataForSEO. En Every App la pasarela guarda la clave una sola vez, para todas las apps."
      secretName="DATAFORSEO_API_KEY"
      steps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            Guarda el resultado como secreto <code>DATAFORSEO_API_KEY</code> en
            tu entorno.
          </li>
        </>
      }
      everyAppSteps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            Un propietario o administrador ejecuta esto desde la copia de Every
            App y pega el valor:
            <CommandBlock command="pnpm everyapp secret set DATAFORSEO_API_KEY" />
          </li>
          <li>Recarga OpenSEO: usará la clave en la siguiente petición.</li>
          <li>
            ¿No tienes cuenta de DataForSEO? Crea un equipo en{" "}
            <a
              className={helpLinkClassName}
              href={TREG_URL}
              target="_blank"
              rel="noreferrer"
            >
              treg
            </a>
            , que vende llamadas a DataForSEO con saldo prepago, y configura su
            token de API en su lugar:
            <CommandBlock command="pnpm everyapp secret set TREG_API_TOKEN" />
          </li>
        </>
      }
      dashboardPasteStep="Pega el valor base64 del comando de terminal de arriba y guarda."
      terminalPromptHint={
        <>
          Cuando te lo pida, usa el valor base64 de <code>login:password</code>.
        </>
      }
    />
  );
}

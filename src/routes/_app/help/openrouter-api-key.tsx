import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  head: () => pageHead("Clave API de OpenRouter"),
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  const accountStep = (
    <li>
      Crea una cuenta en{" "}
      <a
        className={helpLinkClassName}
        href="https://openrouter.ai"
        target="_blank"
        rel="noreferrer"
      >
        openrouter.ai
      </a>{" "}
      y añade créditos (pago por uso, como DataForSEO).
    </li>
  );
  const keyStep = (
    <li>
      Ve a{" "}
      <a
        className={helpLinkClassName}
        href={OPENROUTER_KEYS_URL}
        target="_blank"
        rel="noreferrer"
      >
        Claves API de OpenRouter
      </a>{" "}
      y haz clic en "Create API Key".
    </li>
  );
  return (
    <SecretHelpPage
      title="Configura tu clave API de OpenRouter"
      intro={
        <>
          OpenSEO necesita el secreto <code>OPENROUTER_API_KEY</code> para que
          funcionen las funciones de IA como SAM, el agente SEO de la app. Es
          opcional: todo lo demás de OpenSEO funciona sin él.
        </>
      }
      everyAppIntro="SAM, las sugerencias de prompts y la investigación de la web funcionan con OpenRouter. En Every App la pasarela guarda la clave una sola vez, para todas las apps."
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          {accountStep}
          {keyStep}
          <li>
            Guarda la clave como secreto <code>OPENROUTER_API_KEY</code> en tu
            entorno:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Autoalojado con Docker: <code>.env</code>
              </li>
              <li>
                Cloudflare: configúrala en la interfaz de Workers (ver abajo)
              </li>
              <li>
                Desarrollo local: <code>.env.local</code>
              </li>
            </ul>
          </li>
          <li>Reinicia OpenSEO.</li>
        </>
      }
      everyAppSteps={
        <>
          {accountStep}
          {keyStep}
          <li>
            Un propietario o administrador ejecuta esto desde la copia de Every
            App y pega la clave:
            <CommandBlock command="pnpm everyapp secret set OPENROUTER_API_KEY" />
          </li>
          <li>Recarga OpenSEO.</li>
        </>
      }
      dashboardPasteStep="Pega tu clave API de OpenRouter y guarda."
      terminalPromptHint="Pega tu clave API de OpenRouter cuando te la pida."
    />
  );
}

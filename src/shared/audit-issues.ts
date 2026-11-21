/**
 * Registry of site-audit issue types.
 *
 * Shared between the server (issue engine, MCP tools) and the client
 * (issues UI, CSV export). Each issue row in `audit_issues` references one
 * of these types by id.
 */

// Relative: tests/badseo type-checks this file without the @ alias.
import { RENDERED_CRAWL_TIME_LIMIT_HOURS } from "./audit-limits";

export type IssueSeverity = "critical" | "warning" | "info";

interface AuditIssueDescriptor {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
}

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "El rastreador ha sido bloqueado",
    explanation:
      "El sitio devolvió un desafío antibots o una denegación de acceso (p. ej., un desafío de Cloudflare o un 403) en lugar de la página. Te lo indicamos tal cual en vez de dar la página por rota, pero significa que no se ha podido auditar y que otros rastreadores, como los buscadores, pueden encontrar trabas parecidas.",
    howToFix:
      'Si el sitio es tuyo, añade el user agent "OpenSEO-Audit" a la lista de permitidos de tu WAF o de la protección antibots (en Cloudflare: una regla personalizada del WAF que omita la protección antibots cuando el user agent contenga "OpenSEO-Audit"; en algunos planes gratuitos tendrás que suavizar la protección antibots). Después vuelve a lanzar la auditoría. En Shopify, usa el acceso de rastreadores (Tienda online → Preferencias → Acceso de rastreadores) y pega la firma en OpenSEO, en Ajustes del proyecto → Integraciones → Shopify. Cómo permitir y verificar el rastreador: https://openseo.so/docs/crawler',
  },
  "javascript-rendering-suspected": {
    severity: "warning",
    title: "El contenido puede requerir JavaScript",
    explanation:
      "El HTML de la página contiene un contenedor de aplicación JavaScript con muy poco contenido legible y sin encabezados, enlaces ni imágenes. Puede que la página cargue su contenido en el navegador o que aún estuviera cargando al renderizarla. Nos hemos saltado las comprobaciones de contenido porque este HTML podría no representar la página completa.",
    howToFix:
      'Si esta auditoría no renderizó JavaScript, lanza una nueva con "Renderizar JavaScript" activado para revisar el contenido cargado. Para un rastreo fiable, sirve el contenido y la navegación importantes en el HTML inicial mediante renderizado en servidor o prerenderizado. Este aviso no demuestra que los buscadores no puedan indexar la página.',
  },
  "rate-limited-page": {
    severity: "warning",
    title: "Límite de solicitudes (429)",
    explanation:
      "El servidor respondió 429 Too Many Requests, así que no se ha podido auditar esta página. El rastreador esperó el tiempo indicado en Retry-After y volvió a intentarlo una vez antes de seguir.",
    howToFix:
      'Sube el límite de solicitudes para rastreadores o añade el user agent "OpenSEO-Audit" a la lista de permitidos de tus reglas de limitación (en Cloudflare: una excepción en la regla de limitación de velocidad que coincida con ese user agent). Después vuelve a lanzar la auditoría. Si el límite es estricto, también ayuda volver a lanzarla con menos páginas. En Shopify, usa el acceso de rastreadores (Tienda online → Preferencias → Acceso de rastreadores) y pega la firma en OpenSEO, en Ajustes del proyecto → Integraciones → Shopify. Cómo permitir y verificar el rastreador: https://openseo.so/docs/crawler',
  },
  "crawl-rate-limited": {
    severity: "warning",
    title: "Rastreo detenido antes de tiempo: límite de solicitudes",
    explanation:
      "El sitio rechazó varias páginas seguidas con 429 Too Many Requests, o hizo esperar demasiado al rastreador, así que dejamos de pedir páginas. Este informe está incompleto; las URL que no llegamos a descargar no se marcan como rotas ni como limitadas.",
    howToFix:
      "Vuelve a lanzar la auditoría cuando se restablezca el límite de solicitudes del sitio o pide al propietario que permita el rastreador OpenSEO-Audit (https://openseo.so/docs/crawler). En Shopify, usa el acceso de rastreadores (Tienda online → Preferencias → Acceso de rastreadores) y pega la firma en OpenSEO, en Ajustes del proyecto → Integraciones → Shopify.",
  },
  "crawl-time-limit": {
    severity: "warning",
    title: "Rastreo detenido antes de tiempo: límite de tiempo",
    explanation: `Las auditorías que renderizan JavaScript dejan de rastrear a las ${RENDERED_CRAWL_TIME_LIMIT_HOURS} horas, y esta ha llegado a ese límite. Este informe está incompleto; las URL que no llegamos a descargar no se marcan como rotas.`,
    howToFix:
      "Vuelve a lanzar la auditoría con un límite de páginas más bajo, o sin Renderizar JavaScript si el contenido y los enlaces del sitio están en su HTML. El renderizado solo se cobra por las páginas que realmente se renderizan.",
  },
  "crawl-credits-exhausted": {
    severity: "warning",
    title: "Rastreo detenido antes de tiempo: límite de coste alcanzado",
    explanation:
      "Muchas páginas de este sitio necesitaron nuestro renderizador avanzado, así que la auditoría alcanzó su límite de coste y se detuvo. Solo se te ha cobrado por las páginas que renderizamos.",
    howToFix:
      "Si el sitio no necesita JavaScript para mostrar su contenido, vuelve a lanzarla con Renderizar JavaScript desactivado.",
  },
  "crawl-page-limit": {
    severity: "warning",
    title: "Rastreo detenido antes de tiempo: límite de páginas",
    explanation:
      "La auditoría alcanzó su límite de páginas antes de visitar todas las URL que encontró, así que este informe cubre solo una parte del sitio. En un rastreo parcial no se comprueban las páginas huérfanas.",
    howToFix:
      'Vuelve a lanzar la auditoría con un límite de páginas más alto. Si ya está en el máximo, añade en el robots.txt un grupo para el user agent "OpenSEO-Audit" que bloquee las secciones que no necesitas auditar, como archivos de etiquetas o listados filtrados, para que el límite se dedique a las páginas que importan: https://openseo.so/docs/crawler',
  },
  "server-error": {
    severity: "critical",
    title: "Error del servidor (5xx)",
    explanation:
      "La página devolvió un error de servidor 5xx. Los buscadores que ven errores de servidor de forma repetida rastrean menos el sitio y pueden sacar la página del índice.",
    howToFix:
      "Revisa los logs del servidor para esta URL y corrige el error de fondo. Si la página ya no existe, devuelve un 404/410 o redirígela a una página relacionada en lugar de dar error.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Enlace interno roto",
    explanation:
      "Esta página enlaza a una URL interna que devuelve un estado de error (4xx/5xx). Los enlaces rotos malgastan presupuesto de rastreo, pierden autoridad y frustran a los usuarios: están entre los problemas de SEO técnico más comunes y más dañinos.",
    howToFix:
      "Actualiza el enlace para que apunte a la URL activa correcta o elimínalo. Si el destino se movió, enlaza directamente a la nueva URL en lugar de depender de una redirección.",
  },
  "missing-title": {
    severity: "critical",
    title: "Falta la etiqueta title",
    explanation:
      "La página no tiene <title>. El título es la señal de relevancia on-page más fuerte y el titular que se muestra en los resultados de búsqueda; sin él, los buscadores generan uno por su cuenta, normalmente mal.",
    howToFix:
      "Añade un <title> único y descriptivo de unos 50–60 caracteres que incluya el tema principal de la página.",
  },
  "broken-page": {
    severity: "warning",
    title: "La página devuelve un error (4xx)",
    explanation:
      "Esta URL rastreada devolvió un error de cliente (p. ej., 404). Si aparece en tu sitemap o en otras páginas, los rastreadores siguen malgastando solicitudes en ella.",
    howToFix:
      "Si la página debe existir, restáurala. Si se eliminó a propósito, quítala del sitemap y de los enlaces internos, y plantéate una redirección 301 a la página activa más parecida.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Título duplicado",
    explanation:
      "Varias páginas comparten la misma etiqueta title. Los buscadores usan los títulos para diferenciar páginas; los duplicados hacen que compitan entre sí y bajan el porcentaje de clics.",
    howToFix:
      "Escribe un título único para cada página que describa su contenido concreto. En páginas generadas con plantilla, incluye en la plantilla el atributo que las distingue (nombre, categoría, ubicación).",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Meta descripción duplicada",
    explanation:
      "Varias páginas comparten la misma meta descripción, así que los resultados de búsqueda muestran fragmentos idénticos y los usuarios no pueden distinguirlas.",
    howToFix:
      "Escribe una meta descripción única para cada página o elimina la duplicada: los buscadores generarán un fragmento a partir del contenido de la página, que es mejor que un duplicado incorrecto.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Contenido de página duplicado",
    explanation:
      "Dos o más URL sirven exactamente el mismo texto visible. Los buscadores eligen una versión para indexar e ignoran el resto, y las señales de posicionamiento se reparten entre los duplicados.",
    howToFix:
      "Consolida los duplicados: elige la URL canónica, añade rel=canonical desde las demás y aplica redirecciones 301 a las URL duplicadas cuando sea posible (causas habituales: variantes con o sin barra final, parámetros de URL, variantes http/https o con y sin www).",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Falta la meta descripción",
    explanation:
      "La página no tiene meta descripción. Los buscadores montarán un fragmento con el texto de la página, que suele ser menos atractivo y reduce el porcentaje de clics.",
    howToFix:
      "Añade una meta descripción de unos 70–160 caracteres que resuma la página y dé un motivo para hacer clic.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Falta el encabezado H1",
    explanation:
      "La página no tiene H1. El H1 indica a usuarios y buscadores de qué trata la página; las páginas sin él suelen transmitir peor su tema.",
    howToFix:
      "Añade un único H1 que indique el tema principal de la página, coherente con la etiqueta title.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Varios encabezados H1",
    explanation:
      "La página tiene más de un H1, lo que diluye la señal del tema principal y suele indicar un error de plantilla (p. ej., el logo y el titular marcados ambos como H1).",
    howToFix:
      "Deja un solo H1 para el encabezado principal de la página y baja los demás a H2/H3 (o a elementos sin estilo de encabezado en el caso de logos y similares).",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Cadena de redirecciones",
    explanation:
      "Para llegar a la página final hacen falta dos o más redirecciones seguidas. Cada salto añade latencia, pierde autoridad y consume presupuesto de rastreo; las cadenas largas pueden no seguirse en absoluto.",
    howToFix:
      "Haz que la primera URL (y los enlaces internos) apunten directamente al destino final para que haya como máximo una redirección.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Bucle de redirecciones",
    explanation:
      "Esta redirección acaba apuntando a sí misma, así que la URL nunca se resuelve. Navegadores y rastreadores se rinden con un error.",
    howToFix:
      "Revisa las reglas de redirección de esta URL y rompe el ciclo para que la cadena termine en una página real con 200.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Señales canónicas contradictorias",
    explanation:
      "La página declara URL canónicas distintas en su <link rel=canonical> del HTML y en su cabecera HTTP Link. Cuando las señales se contradicen, los buscadores ignoran ambas y eligen su propia canónica.",
    howToFix:
      "Elige una URL canónica y declárala en un solo sitio (lo más habitual es el head del HTML); elimina o alinea la otra declaración.",
  },
  "thin-content": {
    severity: "warning",
    title: "Contenido escaso",
    explanation:
      "La página tiene muy poco texto visible. Las páginas con poco contenido rara vez posicionan, pueden empeorar la valoración de calidad de todo el sitio y (si el sitio se renderiza en el cliente) pueden indicar contenido invisible para los rastreadores que solo leen HTML.",
    howToFix:
      "Amplía la página con contenido realmente útil, márcala como noindex o intégrala en una página más sólida. Si el contenido existe pero lo renderiza JavaScript, asegúrate de que se renderiza en el servidor o se prerenderiza.",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Imágenes sin texto alternativo",
    explanation:
      "Una o más imágenes de la página no tienen atributo alt. El texto alternativo es un requisito de accesibilidad y la principal forma en que los buscadores entienden las imágenes.",
    howToFix:
      'Añade un texto alternativo descriptivo a las imágenes con significado; usa un alt vacío (alt="") solo para las puramente decorativas.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Página huérfana",
    explanation:
      "Ninguna página rastreada enlaza a esta URL: solo se pudo descubrir a través del sitemap. Las páginas sin enlaces internos reciben poca atención de los rastreadores y nada de autoridad interna, y los usuarios no pueden llegar a ellas navegando.",
    howToFix:
      "Enlaza esta página desde páginas relacionadas (navegación, contenido relacionado, páginas pilar) o quítala del sitemap si no debe indexarse.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "La página no tiene enlaces salientes",
    explanation:
      "La página no contiene ningún enlace: es un callejón sin salida. La autoridad que le llega se queda ahí, los rastreadores no tienen adónde ir y los usuarios tienen que recurrir al botón de volver.",
    howToFix:
      "Añade enlaces a páginas relacionadas, a la categoría superior o a la página de inicio. Si la navegación de la página la renderiza JavaScript, asegúrate de que también existe en el HTML renderizado en el servidor.",
  },
  "title-too-long": {
    severity: "info",
    title: "Título demasiado largo",
    explanation:
      "El título supera los ~60 caracteres, así que los resultados de búsqueda lo truncarán y el final puede quedar cortado a media frase.",
    howToFix:
      "Acorta el título a unos 50–60 caracteres y pon delante las palabras más importantes.",
  },
  "title-too-short": {
    severity: "info",
    title: "Título demasiado corto",
    explanation:
      "El título tiene menos de ~10 caracteres, lo que suele ser demasiado genérico para describir la página o atraer clics.",
    howToFix:
      "Amplía el título con una frase descriptiva (unos 30–60 caracteres) que diga lo que ofrece la página.",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Meta descripción demasiado larga",
    explanation:
      "La meta descripción supera los ~160 caracteres, así que los buscadores truncarán el fragmento.",
    howToFix:
      "Recorta la descripción a unos 70–160 caracteres manteniendo el mensaje principal y la llamada a la acción.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Meta descripción demasiado corta",
    explanation:
      "La meta descripción tiene menos de ~70 caracteres. Las descripciones cortas desaprovechan el espacio del fragmento en los resultados de búsqueda, y los buscadores suelen ignorarlas en favor de texto extraído de la página.",
    howToFix:
      "Amplía la descripción a unos 70–160 caracteres que resuman la página y den un motivo para hacer clic.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Saltos en los niveles de encabezado",
    explanation:
      "La jerarquía de encabezados se salta niveles (p. ej., un H4 justo después de un H2). Esto debilita la estructura del documento para las herramientas de accesibilidad y el análisis del contenido.",
    howToFix:
      "Ajusta los niveles de encabezado para que bajen de uno en uno (H1 → H2 → H3) sin saltarse ninguno.",
  },
  "slow-response": {
    severity: "info",
    title: "Respuesta lenta del servidor",
    explanation:
      "La respuesta HTML tardó más de 1,5 segundos. Un tiempo hasta el primer byte lento empeora todas las métricas de rendimiento posteriores y reduce la frecuencia de rastreo en sitios grandes.",
    howToFix:
      "Revisa el tiempo de servidor y de base de datos y la caché de esta ruta; servir HTML en caché o generado de forma estática suele resolverlo.",
  },
  "noindex-page": {
    severity: "info",
    title: "La página es noindex",
    explanation:
      "La página pide a los buscadores que no la indexen (con la metaetiqueta robots o la cabecera X-Robots-Tag). Suele ser intencionado: es un aviso, no un error.",
    howToFix:
      "Si esta página debe posicionar, elimina la directiva noindex. Si es intencionado (páginas de administración, de agradecimiento o de filtros), no hace falta hacer nada.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Canonicalizada a otra URL",
    explanation:
      "La página declara otra URL como canónica, lo que indica a los buscadores que indexen esa URL en su lugar. Está bien si es intencionado (páginas con parámetros, contenido sindicado), pero es un problema si esta página debía posicionar.",
    howToFix:
      "Si esta página debe posicionar por sí misma, haz que su canónica apunte a sí misma. Si no, no hace falta hacer nada.",
  },
  "deep-page": {
    severity: "info",
    title: "Página muy profunda en la estructura del sitio",
    explanation:
      "La página está a 5 o más clics de la página de inicio. Las páginas profundas se rastrean con menos frecuencia y reciben menos autoridad.",
    howToFix:
      "Añade enlaces desde páginas de nivel superior (páginas pilar, categorías, navegación) para acortar el camino hasta esta página.",
  },
} as const satisfies Record<string, AuditIssueDescriptor>;

export type AuditIssueType = keyof typeof AUDIT_ISSUE_TYPES;

/** Issue types a crawl raises when it stops with URLs left unvisited. */
export const CRAWL_STOP_ISSUE_TYPES = [
  "crawl-rate-limited",
  "crawl-time-limit",
  "crawl-credits-exhausted",
  "crawl-page-limit",
] as const satisfies readonly AuditIssueType[];

export const ISSUE_SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const issueRegistry: Record<string, AuditIssueDescriptor> = AUDIT_ISSUE_TYPES;

export function getIssueDescriptor(
  issueType: string,
): AuditIssueDescriptor | null {
  return issueRegistry[issueType] ?? null;
}

/**
 * src/data/site.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export interface LegalPage {
  path: string;
  title: string;
  shortTitle: string;
  description: string;
  /** Fecha ISO de la última revisión editorial. */
  updated: string;
}

/**
 * Origen público del sitio.
 *
 * Todo lo que requiere una URL absoluta —canónicas, `og:url`, `og:image`, los
 * JSON-LD, el sitemap y `robots.txt`— se construye sobre este valor.
 *
 * Se define con `PUBLIC_SITE_URL` para poder cambiar de dominio sin tocar
 * código: mientras `convertilocal.com` no tenga DNS, el valor por defecto es
 * el subdominio de Vercel, que sí responde. `astro.config.mjs` lee la misma
 * variable, de modo que el sitemap y las canónicas nunca divergen.
 */
export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? 'https://convertilocal.vercel.app')
  .trim()
  .replace(/\/$/, '');

/** Host del origen público, sin protocolo ni barra final. */
export const SITE_DOMAIN = new URL(SITE_URL).host;

/**
 * Trazabilidad del código fuente (AGPL-3.0 §13).
 *
 * Vercel inyecta `VERCEL_GIT_COMMIT_SHA` en el entorno de build. Ese SHA se
 * usa para apuntar al commit exacto que está desplegado, de modo que quien
 * interactúa con el sitio por red pueda obtener el código fuente
 * correspondiente de esa misma versión.
 */
const COMMIT_SHA = (import.meta.env.VERCEL_GIT_COMMIT_SHA ?? '').trim();

/** Repositorio público con el código fuente del sitio. */
export const REPO_URL = (
  import.meta.env.PUBLIC_REPO_URL ?? 'https://github.com/SantyCalz/convertilocal'
).trim();

/** Enlace al código fuente de la versión desplegada. */
export const SOURCE_URL = COMMIT_SHA ? `${REPO_URL}/tree/${COMMIT_SHA}` : REPO_URL;

/** SHA del commit desplegado, o cadena vacía fuera de Vercel. */
export const COMMIT = COMMIT_SHA;

/**
 * Datos del titular que se muestran en privacidad, aviso legal y términos.
 *
 * `name` y `email` son obligatorios: si se vacían, el build falla en lugar de
 * publicar una página legal sin datos de contacto. El resto de campos son
 * descriptivos y pueden ajustarse cuando se disponga de ellos.
 */
export const LEGAL_ENTITY = {
  /** Nombre o denominación del titular. Obligatorio. */
  name: 'ConvertiLocal',
  /** Correo de contacto del titular. Obligatorio. */
  email: 'hola@convertilocal.com',
  /** Identificación fiscal del titular, si se desea publicarla. */
  taxId: 'Se facilita bajo petición por correo electrónico',
  /** Domicilio del titular, si se desea publicarlo. */
  address: 'Se facilita bajo petición por correo electrónico',
  country: 'España',
  hosting: 'Vercel Inc.',
} as const;

/**
 * El build no debe publicar páginas legales sin datos de contacto: son
 * obligatorios para que el aviso legal y la política de privacidad identifiquen
 * al responsable del tratamiento.
 */
for (const field of ['name', 'email'] as const) {
  if (!LEGAL_ENTITY[field] || !LEGAL_ENTITY[field].trim()) {
    throw new Error(
      `LEGAL_ENTITY.${field} está vacío. Rellénalo en src/data/site.ts: sin datos de ` +
        'contacto no se puede publicar una política de privacidad ni un aviso legal válidos.',
    );
  }
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(LEGAL_ENTITY.email)) {
  throw new Error(
    `LEGAL_ENTITY.email no parece una dirección de correo válida: «${LEGAL_ENTITY.email}».`,
  );
}

/** Enlace al código fuente correspondiente del binario de FFmpeg (GitHub Release). */
export const SOURCE_RELEASE_URL = (
  import.meta.env.PUBLIC_SOURCE_RELEASE_URL ??
  'https://github.com/SantyCalz/convertilocal/releases/tag/corresponding-source-v1.0.0'
).trim();

export const SITE = {
  name: 'ConvertiLocal',
  shortName: 'ConvertiLocal',
  /** Todo lo que requiere una URL absoluta sale de aquí. */
  url: SITE_URL,
  /** Host público, sin protocolo. */
  domain: SITE_DOMAIN,
  title: 'ConvertiLocal — Convierte imágenes sin subirlas',
  description:
    'Convierte, comprime y limpia imágenes directamente en tu navegador. Veinte conversiones entre JPG, PNG, WebP, HEIC, AVIF, BMP e ICO, sin subir archivos y sin registro.',
  tagline: 'Tus archivos nunca salen de tu dispositivo',
  locale: 'es_ES',
  lang: 'es',
  themeColor: '#047857',
  /** Correo de contacto. Fuente única: `LEGAL_ENTITY.email`. */
  email: LEGAL_ENTITY.email,
  /**
   * Si está vacío, no se carga AdSense ni se renderizan anuncios reales.
   * El valor por defecto es el ID de editor de la cuenta; definir
   * PUBLIC_ADSENSE_CLIENT como cadena vacía lo desactiva sin tocar código.
   */
  adsenseClient: (import.meta.env.PUBLIC_ADSENSE_CLIENT ?? 'ca-pub-3640204756657627').trim(),
  /** ID del bloque de anuncios. Sin él se reserva el hueco pero no se muestra un anuncio. */
  adsenseSlot: (import.meta.env.PUBLIC_ADSENSE_SLOT ?? '').trim(),
  /** Permite desactivar AdSense y sus scripts sin tocar el código. */
  adsEnabled: (import.meta.env.PUBLIC_ENABLE_ADS ?? 'true').toLowerCase() === 'true',
} as const;

export const LEGAL_PAGES = {
  privacidad: {
    path: '/privacidad',
    title: 'Política de privacidad',
    shortTitle: 'Privacidad',
    description:
      'Qué datos tratamos (y cuáles no), por qué tus archivos nunca se suben y cómo puedes ejercer tus derechos.',
    updated: '2026-10-21',
  },
  cookies: {
    path: '/politica-de-cookies',
    title: 'Política de cookies',
    shortTitle: 'Cookies',
    description:
      'Cookies técnicas, almacenamiento local y publicidad: qué usamos, para qué y cómo controlarlo.',
    updated: '2026-10-21',
  },
  terminos: {
    path: '/terminos',
    title: 'Términos de uso',
    shortTitle: 'Términos',
    description:
      'Las reglas de uso de ConvertiLocal: servicio gratuito, responsabilidad del usuario y límites del servicio.',
    updated: '2026-10-21',
  },
  aviso: {
    path: '/aviso-legal',
    title: 'Aviso legal',
    shortTitle: 'Aviso legal',
    description:
      'Información del titular del sitio, condiciones de acceso y responsabilidad sobre los contenidos.',
    updated: '2026-10-21',
  },
  licencias: {
    path: '/licencias',
    title: 'Licencias y atribuciones',
    shortTitle: 'Licencias',
    description:
      'Licencia AGPL del sitio, componentes con copyleft, código fuente correspondiente y atribuciones.',
    updated: '2026-10-21',
  },
  contacto: {
    path: '/contacto',
    title: 'Contacto',
    shortTitle: 'Contacto',
    description:
      'Escríbenos para dudas, sugerencias, prensa o problemas técnicos. Respondemos en horario laboral.',
    updated: '2026-10-21',
  },
  nosotros: {
    path: '/sobre-nosotros',
    title: 'Sobre nosotros',
    shortTitle: 'Sobre nosotros',
    description:
      'Por qué construimos herramientas que funcionan en tu navegador y qué principios guían ConvertiLocal.',
    updated: '2026-10-21',
  },
  metodologia: {
    path: '/metodologia',
    title: 'Metodología',
    shortTitle: 'Metodología',
    description:
      'Cómo construimos, probamos y documentamos cada herramienta, y qué límites puedes esperar.',
    updated: '2026-10-21',
  },
} as const satisfies Record<string, LegalPage>;

/** Orden de aparición en el aside legal. */
export const LEGAL_LINKS = [
  LEGAL_PAGES.privacidad,
  LEGAL_PAGES.cookies,
  LEGAL_PAGES.terminos,
  LEGAL_PAGES.aviso,
  LEGAL_PAGES.licencias,
  LEGAL_PAGES.contacto,
  LEGAL_PAGES.nosotros,
  LEGAL_PAGES.metodologia,
].map((page) => ({ href: page.path, label: page.shortTitle, title: page.title }));

/**
 * Columna «Legal» del footer: solo documentos normativos.
 * Contacto, Sobre nosotros y Metodología viven en «Proyecto» para no duplicarlos.
 */
export const FOOTER_LEGAL_LINKS = [
  LEGAL_PAGES.privacidad,
  LEGAL_PAGES.cookies,
  LEGAL_PAGES.terminos,
  LEGAL_PAGES.aviso,
  LEGAL_PAGES.licencias,
].map((page) => ({ href: page.path, label: page.shortTitle, title: page.title }));

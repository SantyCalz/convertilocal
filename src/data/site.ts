export interface LegalPage {
  path: string;
  title: string;
  shortTitle: string;
  description: string;
  /** Fecha ISO de la última revisión editorial. */
  updated: string;
}

export const SITE = {
  name: 'ConvertiLocal',
  shortName: 'ConvertiLocal',
  url: 'https://convertilocal.com',
  domain: 'convertilocal.com',
  title: 'ConvertiLocal — Convierte imágenes sin subirlas',
  description:
    'Convierte, comprime y limpia imágenes directamente en tu navegador. Veinte conversiones entre JPG, PNG, WebP, HEIC, AVIF, BMP e ICO, sin subir archivos y sin registro.',
  tagline: 'Tus archivos nunca salen de tu dispositivo',
  locale: 'es_ES',
  lang: 'es',
  themeColor: '#047857',
  email: 'hola@convertilocal.com',
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

/**
 * Datos del titular que deben completarse antes de publicar.
 * Se muestran en privacidad y aviso legal.
 */
export const LEGAL_ENTITY = {
  name: '[Nombre legal del titular]',
  nif: '[NIF]',
  address: '[Domicilio fiscal completo]',
  country: 'España',
  hosting: '[Proveedor de alojamiento]',
} as const;

export const LEGAL_PAGES = {
  privacidad: {
    path: '/politica-de-privacidad',
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
    path: '/terminos-y-condiciones',
    title: 'Términos y condiciones',
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
].map((page) => ({ href: page.path, label: page.shortTitle, title: page.title }));

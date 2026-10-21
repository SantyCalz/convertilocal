/**
 * src/content/legal/privacidad.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { LegalDocument } from './types';

export const PRIVACIDAD: LegalDocument = {
  path: '/privacidad',
  title: 'Política de privacidad',
  shortTitle: 'Privacidad',
  description:
    'Cómo tratamos tus datos en ConvertiLocal: procesamiento 100 % local de tus archivos, ausencia de almacenamiento, publicidad de Google AdSense y cómo ejercer tus derechos.',
  updated: '2026-10-21',
  intro:
    'La regla de oro de este sitio es sencilla: tus archivos no se suben a ningún servidor. ' +
    'Esta política explica qué datos tratamos de ti, por qué y durante cuánto tiempo.',
  sections: [
    {
      id: 'responsable',
      title: '1. Responsable del tratamiento',
      blocks: [
        {
          type: 'facts',
          content: [
            ['Titular', 'LEGAL_ENTITY.name'],
            ['NIF', 'LEGAL_ENTITY.nif'],
            ['Domicilio', 'LEGAL_ENTITY.address'],
            ['País', 'LEGAL_ENTITY.country'],
            ['Contacto', 'hola@convertilocal.com'],
          ],
        },
      ],
    },
    {
      id: 'que-datos',
      title: '2. Qué datos tratamos y cuáles no',
      blocks: [
        {
          type: 'paragraph',
          content:
            'No tratamos ningún dato sobre el contenido de los archivos que procesas. Esos datos ' +
            'se quedan en tu dispositivo.',
        },
        {
          type: 'list',
          content: [
            'No se reciben archivos, imágenes, vídeos, documentos ni carpetas de tu parte.',
            'No se registran metadatos EXIF, GPS ni ningún contenido de los archivos.',
            'No se crean cuentas de usuario ni perfiles.',
            'No se instalan cookies propias de seguimiento ni herramientas de analítica de ' +
              'comportamiento.',
          ],
        },
        {
          type: 'paragraph',
          content:
            'El único tratamiento que puede darse en nuestros servidores es el técnicamente ' +
            'para entregar las páginas: la dirección IP y los datos de la petición que tu ' +
            'navegador envía, y que el proveedor de alojamiento conserva conforme a su propia ' +
            'política.',
        },
      ],
    },
    {
      id: 'procesamiento-local',
      title: '3. Procesamiento 100 % local en el navegador',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Todas las conversiones se ejecutan con JavaScript y WebAssembly dentro de tu ' +
            'navegador. El archivo se lee con la API de ficheros local, se procesa en memoria y el ' +
            'resultado se descarga directamente a tu equipo.',
        },
        {
          type: 'paragraph',
          content:
            'Puedes comprobarlo: abre las herramientas de desarrollo, pestaña Red, y verás que ' +
            'las peticiones solo apuntan a tu propio dominio. Puedes desconectar internet y ' +
            'seguir usando las herramientas.',
        },
        {
          type: 'note',
          content:
            'Excepción: los modelos de segmentación de la herramienta «Eliminar fondo» y el ' +
            'runtime de FFmpeg se descargan del propio dominio en la primera visita. Son ficheros ' +
            'estáticos, no contienen información sobre ti y quedan en la caché del navegador.',
        },
      ],
    },
    {
      id: 'publicidad',
      title: '4. Publicidad: Google AdSense y cookies',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El sitio muestra publicidad mediante Google AdSense. Google y sus socios pueden ' +
            'instalar cookies para servir anuncios y medir su rendimiento. Puedes consultar la ' +
            'configuración de anuncios que permite revisar y cambiar tu consentimiento en ' +
            'Google.',
        },
        {
          type: 'list',
          content: [
            'Gestión de cookies de terceros: https://policies.google.com/technologies/ads',
            'Preferencias de anuncios: https://adssettings.google.com/',
            'Política de privacidad de Google: https://policies.google.com/privacy',
            'ads.txt del sitio: https://convertilocal.com/ads.txt',
          ],
        },
        {
          type: 'paragraph',
          content:
            'Los anunciantes y las redes de publicidad pueden usar cookies propias para ' +
            'segmentar. Google está certificates como proveedor de publicidad en cookie de la UE ' +
            'y ofrece una página con información sobre cómo gestionar esas cookies.',
        },
      ],
    },
    {
      id: 'finalidades',
      title: '5. Finalidades y bases legales',
      blocks: [
        {
          type: 'facts',
          content: [
            [
              'Prestación del servicio',
              'Interés legítimo y ejecución de la petición de acceso a las páginas.',
            ],
            [
              'Publicidad',
              'Interés legítimo en financiar el servicio mediante publicidad no invasiva.',
            ],
            [
              'Seguridad y estabilidad',
              'Interés legítimo en proteger la disponibilidad y la integridad del sitio.',
            ],
            [
              'Comunicaciones',
              'Consentimiento, únicamente si decides escribirnos.',
            ],
          ],
        },
      ],
    },
    {
      id: 'conservacion',
      title: '6. Conservación',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Los archivos que procesas no se conservan en ningún servidor, porque nunca se ' +
            'reciben. Los registros técnicos del servidor se conservan durante el periodo que ' +
            'determine el proveedor de alojamiento, normalmente corto y únicamente por seguridad.',
        },
      ],
    },
    {
      id: 'destinatarios',
      title: '7. Destinatarios y encargados',
      blocks: [
        {
          type: 'paragraph',
          content:
            'No vendemos ni cedemos datos personales. Los encargados que intervienen son el ' +
            'proveedor de alojamiento del sitio y, en la parte publicitaria, Google LLC a través ' +
            'de AdSense, que puede tratar datos conforme a sus propias condiciones.',
        },
      ],
    },
    {
      id: 'derechos',
      title: '8. Tus derechos',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación ' +
            'y portabilidad escribiendo a hola@convertilocal.com. Responderemos en el plazo ' +
            'máximo de un mes.',
        },
        {
          type: 'paragraph',
          content:
            'Si consideras que no hemos atendido correctamente tu solicitud, puedes reclamar ' +
            'ante la Agencia Española de Protección de Datos.',
        },
      ],
    },
    {
      id: 'seguridad',
      title: '9. Seguridad',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El sitio se sirve íntegramente por HTTPS. Como los archivos nunca viajan a nuestros ' +
            'servidores, el vector de riesgo más habitual en este tipo de herramientas se elimina ' +
            'por completo.',
        },
      ],
    },
    {
      id: 'menores',
      title: '10. Menores de edad',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El sitio no está dirigido a menores de catorce años y no recopila de forma consciente ' +
            'datos personales de menores de esa edad.',
        },
      ],
    },
    {
      id: 'cambios',
      title: '11. Cambios en esta política',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Actualizaremos esta política cuando cambien los tratamientos o la legislación ' +
            'aplicable. La fecha de última revisión figura al inicio de la página.',
        },
      ],
    },
    {
      id: 'contacto',
      title: '12. Contacto',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Para cualquier consulta sobre esta política puedes escribir a hola@convertilocal.com.',
        },
      ],
    },
  ],
};

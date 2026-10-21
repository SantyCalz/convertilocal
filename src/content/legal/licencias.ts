/**
 * src/content/legal/licencias.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { LegalDocument } from './types';

/**
 * Documento «Licencias y atribuciones».
 *
 * Los datos de terceros (versiones, licencias y tabla) se generan en
 * `scripts/generate-third-party.mjs` para que no puedan desviarse de lo que
 * realmente se instala y se sirve.
 */
export const LICENCIAS: LegalDocument = {
  path: '/licencias',
  title: 'Licencias y atribuciones',
  shortTitle: 'Licencias',
  description:
    'Licencia del sitio (AGPL-3.0), componentes con copyleft como FFmpeg y @imgly/background-removal, código fuente correspondiente y tabla completa de atribuciones.',
  updated: '2026-10-21',
  intro:
    'ConvertiLocal se publica bajo software libre. Este documento explica qué licencia se aplica al ' +
    'sitio, qué componentes de terceros incluye, qué obligaciones tienen sus licencias y dónde ' +
    'obtener el código fuente correspondiente.',
  sections: [
    {
      id: 'licencia-del-sitio',
      title: '1. Licencia del sitio',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Copyright © 2026 ConvertiLocal contributors. Este sitio y su código fuente se publican ' +
            'bajo la GNU Affero General Public License, versión 3.0 únicamente (SPDX: ' +
            'AGPL-3.0-only). El texto íntegro y canónico de la licencia está disponible en el ' +
            'fichero LICENSE de la raíz del repositorio y en esta página.',
        },
        {
          type: 'paragraph',
          content:
            'La AGPL-3.0 es una licencia copyleft: si modifica este software y lo distribuye, debe ' +
            'seguir publicándose bajo los mismos términos. Además, y a diferencia de la GPL ' +
            'clásica, la AGPL obliga también a ofrecer el código fuente correspondiente cuando el ' +
            'software se usa como servicio a través de la red, que es exactamente el caso de ' +
            'esta web.',
        },
      ],
    },
    {
      id: 'codigo-fuente',
      title: '2. Código fuente correspondiente (AGPL §13)',
      blocks: [
        {
          type: 'paragraph',
          content:
            'En cumplimiento del artículo 13 de la AGPL-3.0, quien interactúe con este sitio ' +
            'mediante una red puede obtener el código fuente correspondiente de la versión que está ' +
            'desplegada. El enlace «Código fuente» del pie de cada página apunta al commit exacto ' +
            'que está en producción.',
        },
        {
          type: 'facts',
          content: [
            ['Repositorio', 'https://github.com/SantyCalz/convertilocal'],
            ['Versión desplegada', 'El commit SHA exacto, enlazado desde el pie de cada página'],
            ['Licencia', 'GNU Affero General Public License v3.0 únicamente (AGPL-3.0-only)'],
          ],
        },
      ],
    },
    {
      id: 'componentes-copyleft',
      title: '3. Componentes de terceros con copyleft',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Dos componentes que el sitio distribuye al navegador tienen copyleft y condicionan la ' +
            'licencia del conjunto:',
        },
        {
          type: 'facts',
          content: [
            [
              '@imgly/background-removal 1.7.0',
              'AGPL-3.0. Se usa en la herramienta «Eliminar fondo». Sus pesos de modelo (IS-Net) ' +
                'se sirven desde este mismo dominio.',
            ],
            [
              '@ffmpeg/core 0.12.10 (ffmpeg.wasm)',
              'GPL-2.0-or-later. Se usa en las herramientas de audio y vídeo. El binario servido es ' +
                'una build GPL (véase el apartado 4).',
            ],
          ],
        },
        {
          type: 'paragraph',
          content:
            'El resto de dependencias se distribuye bajo licencias permisivas (MIT, Apache-2.0, ' +
            'BSD, ISC) o bajo MPL-2.0 en alternativa a Apache-2.0, como es el caso de ' +
            'dompurify, del que se ha elegido la opción Apache-2.0. La tabla completa está en el ' +
            'apartado 6.',
        },
      ],
    },
    {
      id: 'ffmpeg',
      title: '4. FFmpeg: variante GPL y código fuente',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El binario ffmpeg-core.wasm que sirve este sitio es una variante GPL de FFmpeg ' +
            '5.1.4, compilada a WebAssembly con Emscripten 3.1.40. La configuración de ' +
            'compilación incluye --enable-gpl, --enable-libx264 y --enable-libx265, por lo que ' +
            'no se trata de una build LGPL.',
        },
        {
          type: 'paragraph',
          content:
            'El binario no ha sido modificado por este proyecto: se copia sin cambios desde el ' +
            'paquete npm @ffmpeg/core 0.12.10. El manifiesto completo, con la cadena de ' +
            'configuración íntegra, el hash SHA-256, la tabla de librerías incluidas y las ' +
            'instrucciones para reconstruirlo, está en el fichero de manifiesto de fuente que ' +
            'acompaña a esta página.',
        },
        {
          type: 'facts',
          content: [
            ['Binario', 'public/assets/wasm/ffmpeg-core.wasm (30,74 MB)'],
            ['Versión de FFmpeg', 'n5.1.4'],
            ['Código fuente de FFmpeg', 'https://github.com/FFmpeg/FFmpeg/tree/n5.1.4'],
            ['Scripts de compilación', 'https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10'],
            ['Licencia aplicable', 'GPL-2.0-or-later (texto completo en /licencias/gpl-2.0.txt)'],
          ],
        },
        {
          type: 'note',
          content:
            'FFmpeg es una marca de Fabrice Bellard. Esta distribución no está afiliada a los ' +
            'titulares de las marcas mencionadas.',
        },
      ],
    },
    {
      id: 'marca',
      title: '5. Marca y nombre',
      blocks: [
        {
          type: 'paragraph',
          content:
            '«ConvertiLocal», el nombre del dominio convertilocal.com, el logotipo y el diseño ' +
            'gráfico son marcas de sus respectivos titulares y NO están cubiertos por la ' +
            'AGPL-3.0 ni por ninguna de las licencias de terceros listadas aquí. La licencia cubre ' +
            'el código fuente del proyecto y sus textos legales, no la marca.',
        },
        {
          type: 'paragraph',
          content:
            'Los nombres de los proyectos de terceros citados en esta página pertenecen a sus ' +
            'respectivos autores y se mencionan con fines meramente informativos.',
        },
      ],
    },
    {
      id: 'tabla-terceros',
      title: '6. Inventario de dependencias de terceros',
      blocks: [
        {
          type: 'paragraph',
          content:
            'La tabla siguiente se genera automáticamente durante la compilación a partir de los ' +
            'paquetes realmente instalados, de modo que no puede desviarse del software que se ' +
            'distribuye. El inventario completo, con los textos de licencia, se publica también ' +
            'como fichero descargable.',
        },
      ],
    },
    {
      id: 'textos-licencia',
      title: '7. Textos de licencia',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Los textos completos de las licencias aplicables se sirven desde este mismo ' +
            'dominio, para que puedan consultarse sin salir del sitio:',
        },
        {
          type: 'list',
          content: [
            '/licencias/agpl-3.0.txt — GNU Affero General Public License v3.0',
            '/licencias/gpl-2.0.txt — GNU General Public License v2.0',
            '/licencias/gpl-3.0.txt — GNU General Public License v3.0',
            '/licencias/lgpl-2.1.txt — GNU Lesser General Public License v2.1',
            '/licencias/apache-2.0.txt — Apache License 2.0',
            '/licencias/mit.txt — MIT License',
            '/licencias/bsd-3-clause.txt — BSD 3-Clause',
            '/licencias/isc.txt — ISC License',
            '/licencias/terceros.txt — inventario de terceros en texto plano',
            '/licencias/ffmpeg-fuente.txt — manifiesto del código fuente de FFmpeg',
          ],
        },
      ],
    },
    {
      id: 'solo-build',
      title: '8. Dependencias que no se distribuyen',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Algunas dependencias se instalan solo para compilar el sitio y no llegan al ' +
            'navegador, por lo que no generan obligaciones de distribución. Es el caso de sharp ' +
            '(Apache-2.0 con LGPL-3.0, dependencia opcional de Astro que este proyecto no usa), ' +
            'de ffmpeg-static y de las herramientas de desarrollo.',
        },
      ],
    },
  ],
};

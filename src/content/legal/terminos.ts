/**
 * src/content/legal/terminos.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { LegalDocument } from './types';

export const TERMINOS: LegalDocument = {
  path: '/terminos',
  title: 'Términos de uso',
  shortTitle: 'Términos',
  description:
    'Condiciones de uso de ConvertiLocal: procesamiento 100 % local en el navegador, uso permitido, compatibilidad con la AGPL, límites de responsabilidad y exención de garantías.',
  updated: '2026-10-21',
  intro:
    'Estas condiciones regulan el uso del sitio web convertilocal.com. Al navegar por él ' +
    'aceptas estos términos.',
  sections: [
    {
      id: 'identificacion',
      title: '1. Identificación del servicio',
      blocks: [
        {
          type: 'facts',
          content: [
            ['Titular', 'LEGAL_ENTITY.name'],
            ['NIF', 'LEGAL_ENTITY.nif'],
            ['Domicilio', 'LEGAL_ENTITY.address'],
            ['País', 'LEGAL_ENTITY.country'],
            ['Alojamiento', 'LEGAL_ENTITY.hosting'],
            ['Contacto', 'hola@convertilocal.com'],
          ],
        },
      ],
    },
    {
      id: 'descripcion',
      title: '2. Descripción del servicio',
      blocks: [
        {
          type: 'paragraph',
          content:
            'ConvertiLocal ofrece un conjunto de herramientas en línea para convertir, comprimir, ' +
            'redimensionar, recortar y limpiar archivos de imagen, documento, datos y multimedia. ' +
            'Todas las operaciones se ejecutan íntegramente en el navegador del usuario, mediante ' +
            'JavaScript y WebAssembly.',
        },
        {
          type: 'paragraph',
          content:
            'El servicio es gratuito, no requiere registro y no almacena los archivos que el ' +
            'usuario procesa. El contenido de los archivos permanece en el dispositivo del ' +
            'usuario y se descarta al cerrar la pestaña o recargar la página.',
        },
      ],
    },
    {
      id: 'uso-permitido',
      title: '3. Uso permitido y obligaciones',
      blocks: [
        {
          type: 'list',
          content: [
            'Usar las herramientas con archivos de los que seas titular o sobre los que tengas ' +
              'autorización para procesar.',
            'No usar el sitio para infringir derechos de propiedad intelectual, Honores ' +
              'privativos o de protección de datos de terceros.',
            'No intentar alterar, eludir o desactivar los sistemas de seguridad o de ' +
              'limitación de carga del servicio.',
            'No realizar un uso automatizado y masivo que degrade la disponibilidad para otras ' +
              'personas.',
          ],
        },
      ],
    },
    {
      id: 'propiedad-intelectual',
      title: '4. Propiedad intelectual y licencia AGPL',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El código fuente de este sitio se publica bajo la GNU Affero General Public License ' +
            'versión 3.0 únicamente. Puedes estudiarlo, modificarlo y redistribuirlo bajo los ' +
            'mismos términos, y la AGPL obliga además a mantener visible el aviso de licencia y ' +
            'a ofrecer el código fuente correspondiente de cualquier versión modificada que se ' +
            'distribuya, incluso a través de la red.',
        },
        {
          type: 'paragraph',
          content:
            'La licencia se aplica al código y a los textos legales. La marca «ConvertiLocal», el ' +
            'nombre del dominio y el diseño gráfico quedan fuera de la licencia y no deben ' +
            'reutilizarse sin autorización.',
        },
      ],
    },
    {
      id: 'disponibilidad',
      title: '5. Disponibilidad y cambios',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El servicio se ofrece «tal cual» y «según disponibilidad», sin garantía de ' +
            'continuidad. Podemos añadir, modificar o retirar herramientas en cualquier momento, ' +
            'y hacerlo sin previo aviso.',
        },
        {
          type: 'paragraph',
          content:
            'La decisión de retirar una herramienta no afecta a los derechos que la AGPL te ' +
            'otorgan sobre el código ya publicado: seguirás teniendo acceso al código fuente de ' +
            'la versión que estaba en producción.',
        },
      ],
    },
    {
      id: 'responsabilidad',
      title: '6. Limitación de responsabilidad y exención de garantías',
      blocks: [
        {
          type: 'paragraph',
          content:
            'En la máxima medida permitida por la legislación aplicable, ConvertiLocal no se ' +
            'hace responsable de los daños derivados del uso o de la imposibilidad de uso del ' +
            'sitio, ni de la pérdida de datos, archivos o resultados, ni de la interrupción del ' +
            'servicio.',
        },
        {
          type: 'paragraph',
          content:
            'El software se distribuye SIN GARANTÍA DE NINGÚN TIPO, ni expresa ni implícita, ' +
            'incluyendo, entre otras, las garantías de MERCHANTABILITY o IDONEIDAD PARA UN ' +
            'FINALIDAD PARTICULAR. El resultado de cualquier conversión debe verificarse por parte ' +
            'del usuario antes de confiar en él.',
        },
        {
          type: 'paragraph',
          content:
            'Nada en estos términos excluye la responsabilidad que no pueda legalmente ' +
            'excluirse.',
        },
      ],
    },
    {
      id: 'terceros',
      title: '7. Enlaces y servicios de terceros',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El sitio puede enlazar a sitios de terceros, en cuyo caso no respondemos de su ' +
            'contenido ni de sus prácticas de privacidad. La publicidad se sirve a través de ' +
            'Google AdSense, que tiene sus propias condiciones y política de cookies.',
        },
      ],
    },
    {
      id: 'privacidad-cookies',
      title: '8. Privacidad y cookies',
      blocks: [
        {
          type: 'paragraph',
          content:
            'El tratamiento de datos personales, el uso de cookies y la información sobre ' +
            'publicidad se detallan en la política de privacidad y en la política de cookies, que ' +
            'forman parte de estos términos.',
        },
      ],
    },
    {
      id: 'modificaciones',
      title: '9. Modificaciones de estos términos',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Podemos actualizar estos términos. La versión vigente es la que se publica en esta ' +
            'página, con su fecha de última revisión. Los cambios relevantes se anunciarán de ' +
            'forma visible en el sitio.',
        },
      ],
    },
    {
      id: 'ley-aplicable',
      title: '10. Ley aplicable y jurisdicción',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Estos términos se rigen por la legislación aplicable del titular y se someten a los ' +
            'juzgados y tribunales que resulten aplicables conforme a la normativa vigente.',
        },
      ],
    },
    {
      id: 'contacto',
      title: '11. Contacto',
      blocks: [
        {
          type: 'paragraph',
          content:
            'Para cualquier duda sobre estos términos puedes escribir a hola@convertilocal.com.',
        },
      ],
    },
  ],
};

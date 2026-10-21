# Avisos de terceros

ConvertiLocal incluye o carga de forma diferida los siguientes componentes. Las versiones corresponden a `package-lock.json` en el momento de la Fase 1.

| Componente | Versión | Licencia | Uso |
| --- | --- | --- | --- |
| Astro | 5.x | MIT | Framework y build estático |
| Tailwind CSS | 3.4.x | MIT | Estilos |
| fflate | 0.8.3 | MIT | Creación de ZIP en el navegador (carga diferida) |
| heic2any | 0.0.4 | MIT | Decodificación HEIC (carga diferida) |
| libheif (incluido en heic2any) | Según build de heic2any | LGPL-3.0 | Decodificación HEIF/HEIC |
| @jsquash/avif | 2.1.1 | Apache-2.0 | Codificación AVIF mediante WebAssembly (carga diferida) |
| Códec AV1 de AOM / libavif (incluidos en @jsquash/avif) | Según build del paquete | BSD y licencias de patentes correspondientes | Codificación AVIF |
| @imgly/background-removal | 1.7.0 | MIT | Eliminación de fondo con modelo de segmentación (carga diferida) |
| onnxruntime-web | 1.21.0 | MIT | Inferencia del modelo de segmentación en WebAssembly |
| Modelos IS-Net (isnet, isnet_fp16, isnet_quint8) | https://github.com/xuebinqin/DIS | Apache-2.0 | Pesos del modelo de segmentación, servidos desde el propio dominio |

## Textos y enlaces

- Astro: https://github.com/withastro/astro — MIT.
- Tailwind CSS: https://github.com/tailwindlabs/tailwindcss — MIT.
- fflate: https://github.com/101arrowz/fflate — MIT.
- heic2any: https://github.com/alexcorvi/heic2any — MIT.
- libheif: https://github.com/strukturag/libheif — LGPL-3.0.
- @jsquash/avif: https://github.com/jamsinclair/jSquash/tree/main/packages/avif — Apache-2.0.
- @imgly/background-removal: https://github.com/imgly/background-removal-js — MIT.
- onnxruntime-web: https://github.com/microsoft/onnxruntime — MIT.
- Modelos IS-Net: https://github.com/SkyTNT/image-segmentation-pytorch — Apache-2.0.

Las licencias completas de los paquetes instalados están en `node_modules/<paquete>/LICENSE*` y se conservan durante el desarrollo. Antes de publicar, copia los textos completos que exijan las licencias al paquete de distribución.

## Assets de eliminación de fondo

`npm run sync:bg` descarga el runtime de ONNX y los modelos IS-Net desde los servidores de IMG.LY y los guarda en `public/assets/imgly/`, que se sirve desde el propio dominio. La librería resuelve cada fragmento como `new URL(chunk.name, publicPath)`, así que los ficheros se guardan de forma plana con el nombre del hash y no dentro de una carpeta por recurso.

- `public/assets/imgly/resources.json` describe cada recurso y sus fragmentos.
- `public/assets/imgly/<hash>` son los fragmentos servidos al navegador.

Los assets son propiedad de IMG.LY (runtime) y del proyecto IS-Net (pesos del modelo) y se redistribuyen bajo sus respectivas licencias. `npm run sync:bg -- --check` verifica que todos los fragmentos estén presentes sin descargar nada.

## Nota sobre LGPL y heic2any

`heic2any` distribuye un build de libheif compilado a WebAssembly dentro de su bundle. libheif se distribuye bajo LGPL-3.0. La LGPL permite usar la biblioteca en un producto propietario siempre que se cumplan sus condiciones, entre ellas:

- informar de que el producto usa libheif y su licencia;
- permitir la sustitución o relocalización de la biblioteca cubierta;
- ofrecer el código fuente correspondiente de la versión utilizada.

Como el WASM viaja dentro de un chunk JavaScript, la sustitución no es trivial. **Antes de lanzar**, revisa este punto con asesoría legal y decide entre:

1. mantener `heic2any` y publicar el aviso, el código fuente y un mecanismo de sustitución razonable;
2. sustituirlo por un decodificador con licencia permisiva;
3. mover la conversión HEIC a un servicio aparte (rompería la promesa 100 % local y no es la opción recomendada).

Este documento es un inventario técnico, no asesoría legal.

## Marcas

Apple, iPhone, Windows, Google Chrome, Firefox y Safari son marcas de sus respectivos titulares. ConvertiLocal no está afiliado a ninguno de ellos.

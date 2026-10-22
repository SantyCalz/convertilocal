/**
 * src/scripts/workers/pdf-to-pdfa.worker.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Cadena de conversión a PDF/A-2b:
 *
 *   1. Ghostscript WASM (en modo SAFER) optimiza el PDF: reescribe el
 *      documento, elimina objetos no usados, incrusta las fuentes que puede
 *      y normaliza la estructura.
 *   2. pdf-lib inyecta el `OutputIntent` con el perfil ICC sRGB y los
 *      metadatos XMP `pdfaid:part=2` / `pdfaid:conformance=B`.
 *
 * Por qué no se usa `-dPDFA=2` directamente: la build WASM de Ghostscript
 * 9.56.0 no admite `--permit-file-read`, así que en modo SAFER no puede leer
 * el perfil ICC desde el sistema de ficheros virtual; con `-dNOSAFER` sí,
 * pero eso desactiva el aislamiento del intérprete PostScript. La inyección
 * con pdf-lib permite mantener SAFER y obtener el OutputIntent igualmente.
 */
interface PdfaJobRequest {
  id: string;
  file: File;
  options: Record<string, unknown>;
}

interface PdfaWorkerMessage {
  type: 'progress' | 'result' | 'error';
  id: string;
  percent?: number;
  blob?: Blob;
  code?: string;
  message?: string;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PdfaJobRequest>) => void) | null;
  postMessage: (message: PdfaWorkerMessage) => void;
};

type GhostscriptInstance = {
  callMain: (args: string[]) => number;
  FS: {
    writeFile: (path: string, data: Uint8Array | string) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
};

type GhostscriptFactory = (options?: {
  locateFile?: (path: string) => string;
  print?: (line: string) => void;
  printErr?: (line: string) => void;
}) => Promise<GhostscriptInstance>;

let gsInstance: GhostscriptInstance | null = null;
let iccProfile: Uint8Array | null = null;

/**
 * Carga la factoría de Ghostscript desde `/assets/gs/gs.js`.
 *
 * No se usa `import '@jspawn/ghostscript-wasm'`: su entrada ESM depende de
 * `globalThis.exports`, que un bundler no reproduce, y falla con
 * «createModule is not defined». El script es un módulo Emscripten clásico
 * que declara `var Module`; evaluarlo con `new Function` en el ámbito global
 * del worker devuelve la factoría sin tocar el bundler.
 */
async function loadGhostscriptFactory(): Promise<GhostscriptFactory> {
  const response = await fetch('/assets/gs/gs.js');
  if (!response.ok) {
    throw new Error(`No se pudo descargar Ghostscript (HTTP ${response.status}).`);
  }
  const source = await response.text();
  const factory = new Function(`${source}\nreturn Module;`)() as GhostscriptFactory;
  if (typeof factory !== 'function') {
    throw new Error('El binario de Ghostscript no expone una factoría válida.');
  }
  return factory;
}

async function getGs(report: (percent: number) => void): Promise<GhostscriptInstance> {
  if (gsInstance) return gsInstance;

  report(5);
  const factory = await loadGhostscriptFactory();

  report(15);
  gsInstance = await factory({
    locateFile: (path: string) => `/assets/gs/${path}`,
    print: () => {},
    printErr: () => {},
  });

  report(40);
  return gsInstance;
}

async function getIccProfile(): Promise<Uint8Array> {
  if (iccProfile) return iccProfile;
  const response = await fetch('/assets/gs/srgb.icc');
  if (!response.ok) {
    throw new Error('No se pudo cargar el perfil ICC de PDF/A.');
  }
  iccProfile = new Uint8Array(await response.arrayBuffer());
  return iccProfile;
}

/**
 * Añade el OutputIntent (con el ICC sRGB) y los metadatos XMP de PDF/A-2b
 * al PDF ya optimizado por Ghostscript.
 */
async function injectPdfaMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const { PDFDocument, PDFName } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const icc = await getIccProfile();

  // OutputIntent con el perfil ICC sRGB.
  const iccStream = pdfDoc.context.stream(icc as unknown as Uint8Array, {
    Type: 'ICCProfile',
    N: 3,
  });
  const iccRef = pdfDoc.context.register(iccStream);

  const outputIntent = pdfDoc.context.obj({
    Type: 'OutputIntent',
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: 'sRGB IEC61966-2.1',
    RegistryName: 'http://www.color.org',
    Info: 'sRGB IEC61966-2.1',
    DestOutputProfile: iccRef,
  });
  const outputIntentRef = pdfDoc.context.register(outputIntent);

  pdfDoc.catalog.set(PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntentRef]));

  // Metadatos XMP con la identificación PDF/A-2b.
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="ConvertiLocal">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <dc:format>application/pdf</dc:format>
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <xmp:CreatorTool>ConvertiLocal</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metadataStream = pdfDoc.context.stream(xmp, {
    Type: 'Metadata',
    Subtype: 'XML',
  });
  pdfDoc.catalog.set(PDFName.of('Metadata'), pdfDoc.context.register(metadataStream));

  pdfDoc.setProducer('ConvertiLocal (Ghostscript 9.56.0 + pdf-lib)');
  pdfDoc.setCreator('ConvertiLocal');

  return pdfDoc.save();
}

scope.onmessage = (event: MessageEvent<PdfaJobRequest>): void => {
  const { id, file } = event.data;
  if (!id || !file) return;

  const report = (percent: number): void => {
    scope.postMessage({ type: 'progress', id, percent });
  };

  (async () => {
    try {
      const gs = await getGs(report);

      report(50);
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      gs.FS.writeFile('input.pdf', inputBytes);

      report(55);
      try {
        gs.callMain([
          '-dQUIET',
          '-dNOPAUSE',
          '-dBATCH',
          '-dSAFER',
          '-sDEVICE=pdfwrite',
          '-dCompatibilityLevel=1.7',
          '-dEmbedAllFonts=true',
          '-dSubsetFonts=true',
          '-o',
          'output.pdf',
          'input.pdf',
        ]);
      } catch (error) {
        throw new Error(
          `Ghostscript no pudo procesar el archivo: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      report(70);

      let optimized: Uint8Array;
      try {
        optimized = gs.FS.readFile('output.pdf');
      } catch {
        throw new Error('Ghostscript no generó un archivo de salida.');
      }

      // Limpieza de la memoria virtual para no acumular entre ejecuciones.
      try {
        gs.FS.unlink('input.pdf');
      } catch {
        /* best-effort */
      }
      try {
        gs.FS.unlink('output.pdf');
      } catch {
        /* best-effort */
      }

      if (!optimized || optimized.length === 0) {
        throw new Error('Ghostscript generó un archivo vacío.');
      }

      report(80);
      const pdfaBytes = await injectPdfaMetadata(optimized);

      report(100);
      const blob = new Blob([pdfaBytes as BlobPart], { type: 'application/pdf' });
      scope.postMessage({ type: 'result', id, blob });
    } catch (error) {
      scope.postMessage({
        type: 'error',
        id,
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'No se pudo convertir el PDF.',
      });
    }
  })();
};

import type { ProcessorOutput } from '@/types/processor';

export type DownloadOutcome = 'downloaded' | 'shared' | 'cancelled';

interface DownloadOptions {
  fallbackName?: string;
  title?: string;
  zipName?: string;
}

const MAX_ZIP_BYTES = 200 * 1024 * 1024;

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
}

function toFile(output: ProcessorOutput, index: number, fallbackName: string): File {
  if (output instanceof File) return output;
  const subtype = output.type.split('/')[1]?.split(';')[0] || 'bin';
  return new File([output], `${fallbackName}-${index + 1}.${subtype}`, {
    type: output.type || 'application/octet-stream',
  });
}

function canShareFiles(files: File[]): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function triggerDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Safari necesita que el blob siga vivo unos segundos.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function uniqueEntryName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base}-${index}${extension}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

async function buildZip(files: File[], archiveName: string): Promise<File | null> {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_ZIP_BYTES) return null;

  try {
    const { zipSync } = await import('fflate');
    const entries: Record<string, Uint8Array> = {};
    const used = new Set<string>();
    for (const file of files) {
      entries[uniqueEntryName(file.name, used)] = new Uint8Array(await file.arrayBuffer());
    }
    // Las imágenes ya vienen comprimidas: empaquetar sin recomprimir es más rápido.
    const zipped = zipSync(entries, { level: 0 });
    return new File([zipped], archiveName, { type: 'application/zip' });
  } catch (error) {
    console.warn('No se pudo crear el ZIP; se descargarán los archivos por separado.', error);
    return null;
  }
}

/**
 * Descarga los resultados.
 *
 * Con un solo archivo usa Blob + `<a download>` (o Web Share en iOS). Con
 * varios intenta crear un ZIP en local con fflate; si no es posible, descarga
 * los archivos de forma escalonada.
 */
export async function downloadOutputs(
  outputs: ProcessorOutput[],
  {
    fallbackName = 'convertilocal',
    title = 'Archivo convertido',
    zipName = `${fallbackName}.zip`,
  }: DownloadOptions = {},
): Promise<DownloadOutcome> {
  if (outputs.length === 0) return 'cancelled';

  const files = outputs.map((output, index) => toFile(output, index, fallbackName));
  const archive = files.length > 1 ? await buildZip(files, zipName) : null;
  const downloadable = archive ? [archive] : files;

  if (isIOS() && canShareFiles(downloadable)) {
    try {
      await navigator.share({ files: downloadable, title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Si falla el share, probamos la descarga clásica.
    }
  }

  downloadable.forEach((file, index) => {
    window.setTimeout(() => triggerDownload(file), index * 150);
  });

  return 'downloaded';
}

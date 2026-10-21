const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const DEFAULT_ICO_SIZES = [16, 32, 48, 64, 128, 256];

function hasPngSignature(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

/** Extrae la imagen PNG más grande de un ICO (los favicons modernos la incluyen). */
export function extractLargestIcoPng(buffer: ArrayBuffer): Blob | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 22) return null;
  const view = new DataView(buffer);
  const count = view.getUint16(4, true);
  if (count === 0) return null;

  let best: { offset: number; size: number; area: number } | null = null;

  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    if (entry + 16 > bytes.length) break;
    const width = bytes[entry] === 0 ? 256 : (bytes[entry] ?? 0);
    const height = bytes[entry + 1] === 0 ? 256 : (bytes[entry + 1] ?? 0);
    const size = view.getUint32(entry + 8, true);
    const offset = view.getUint32(entry + 12, true);
    if (offset + size > bytes.length) continue;
    if (!best || width * height > best.area) {
      best = { offset, size, area: width * height };
    }
  }

  if (!best) return null;
  const candidate = bytes.subarray(best.offset, best.offset + best.size);
  if (!hasPngSignature(candidate)) return null;
  return new Blob([candidate.slice()], { type: 'image/png' });
}

/** Origen válido para dibujar en un lienzo: mapa de bits o lienzo ya pintado. */
export type IcoSource = ImageBitmap | OffscreenCanvas;

/** Genera un ICO multi-resolución con entradas PNG. */
export async function encodeIco(
  source: IcoSource,
  sizes: number[] = DEFAULT_ICO_SIZES,
): Promise<{ blob: Blob; sizes: number[] }> {
  const uniqueSizes = [...new Set(sizes)]
    .map((size) => Math.round(size))
    .filter((size) => size >= 8 && size <= 256)
    .sort((a, b) => a - b);

  const effective = uniqueSizes.length > 0 ? uniqueSizes : DEFAULT_ICO_SIZES;
  const pngs: Uint8Array[] = [];

  for (const size of effective) {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el lienzo para el ICO.');
    context.clearRect(0, 0, size, size);
    const scale = Math.min(size / source.width, size / source.height);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    pngs.push(new Uint8Array(await blob.arrayBuffer()));
  }

  const headerSize = 6 + effective.length * 16;
  const totalSize = headerSize + pngs.reduce((sum, png) => sum + png.length, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, effective.length, true);

  let offset = headerSize;
  effective.forEach((size, index) => {
    const png = pngs[index]!;
    const entry = 6 + index * 16;
    bytes[entry] = size >= 256 ? 0 : size;
    bytes[entry + 1] = size >= 256 ? 0 : size;
    bytes[entry + 2] = 0;
    bytes[entry + 3] = 0;
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(png, offset);
    offset += png.length;
  });

  return { blob: new Blob([buffer], { type: 'image/x-icon' }), sizes: effective };
}

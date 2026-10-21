/** Codificador BMP sin dependencias: 24 bits, filas de abajo arriba. */
export function encodeBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x42; // B
  bytes[1] = 0x4d; // M
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  for (let y = 0; y < height; y += 1) {
    const sourceRow = (height - 1 - y) * width * 4;
    const targetRow = 54 + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const source = sourceRow + x * 4;
      const target = targetRow + x * 3;
      bytes[target] = data[source + 2] ?? 0;
      bytes[target + 1] = data[source + 1] ?? 0;
      bytes[target + 2] = data[source] ?? 0;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

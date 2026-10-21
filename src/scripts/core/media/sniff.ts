export function isMediaAccept(accept: string): boolean {
  const rules = accept.toLowerCase().split(',').map((rule) => rule.trim());
  return rules.some((rule) =>
    [
      '.mp3', '.wav', '.ogg', '.oga', '.aac', '.m4a', '.flac', '.webm', '.mp4', '.mov', '.gif',
      'audio/', 'video/', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
      'video/mp4', 'video/webm', 'video/quicktime',
    ].some((needle) => rule.includes(needle)),
  );
}

export async function sniffMedia(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true; // RIFF
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true; // ID3
  if (bytes.length > 1) {
    const second = bytes[1];
    if (second !== undefined && bytes[0] === 0xff && (second & 0xe0) === 0xe0) return true;
  }
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true; // OggS
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return true; // WebM/MKV
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) return true; // fLaC
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true; // ftyp
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true; // GIF

  return false;
}

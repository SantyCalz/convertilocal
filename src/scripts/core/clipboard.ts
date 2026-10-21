/**
 * Extrae archivos de un evento `paste` (Ctrl/Cmd+V).
 * Cubre tanto capturas de pantalla como archivos copiados desde el explorador.
 */
export function filesFromClipboard(event: ClipboardEvent): File[] {
  const clipboard = event.clipboardData;
  if (!clipboard) return [];

  const directFiles = Array.from(clipboard.files ?? []);
  if (directFiles.length > 0) return directFiles;

  const files: File[] = [];
  for (const item of Array.from(clipboard.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

/** Algunos navegadores pegan capturas con nombres genéricos como `image.png`. */
export function nameClipboardFile(file: File, index: number): File {
  if (file.name && file.name !== 'image.png') return file;

  const subtype = file.type.split('/')[1]?.split(';')[0] || 'png';
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return new File([file], `pegado-${stamp}-${index + 1}.${subtype}`, {
    type: file.type,
    lastModified: Date.now(),
  });
}

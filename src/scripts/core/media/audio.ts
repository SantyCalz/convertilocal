export async function getMediaDuration(file: File): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
    element.preload = 'metadata';
    element.src = url;

    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(element.duration) ? element.duration : 0);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la duración del archivo.'));
    };
  });
}

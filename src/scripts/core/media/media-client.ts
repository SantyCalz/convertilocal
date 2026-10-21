import { FFmpeg } from '@ffmpeg/ffmpeg';

export type MediaOutput = {
  data: Uint8Array;
  name: string;
  extension: string;
};

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onProgress?: (percent: number) => void): Promise<FFmpeg> {
  if (ffmpeg?.loaded) {
    if (onProgress) {
      ffmpeg.off('progress', () => undefined);
      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      });
    }
    return ffmpeg;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const instance = new FFmpeg();
      instance.on('progress', ({ progress: _progress }: { progress: number }) => {
        // El callback se reasigna por job; este es el inicial.
      });
      await instance.load({
        coreURL: '/assets/wasm/ffmpeg-core.js',
        wasmURL: '/assets/wasm/ffmpeg-core.wasm',
      });
      ffmpeg = instance;
      return instance;
    })();
  }

  const instance = await loadPromise;
  if (onProgress) {
    instance.off('progress', () => undefined);
    instance.on('progress', ({ progress }: { progress: number }) => {
      onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    });
  }
  return instance;
}

function numberOption(options: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(options[key]);
  return Number.isFinite(value) ? value : fallback;
}

function stringOption(options: Record<string, unknown>, key: string, fallback: string): string {
  const value = options[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function outputExtension(command: string, options: Record<string, unknown>) {
  if (command === 'gif') return 'gif';
  if (command === 'compress') return 'mp4';

  const format = String(options.format ?? options.outputFormat ?? 'mp3').toLowerCase();
  if (['mp3', 'wav', 'ogg', 'oga', 'aac', 'm4a', 'flac', 'webm', 'mp4', 'mov'].includes(format)) {
    return format === 'oga' ? 'ogg' : format;
  }
  return 'mp3';
}

function buildArgs(command: string, inputName: string, outputName: string, options: Record<string, unknown>) {
  if (command === 'convert' || command === 'extract') {
    const bitrate = numberOption(options, 'bitrate', 128);
    const sampleRate = numberOption(options, 'sampleRate', 44100);
    const channels = options.channels === 'mono' ? 1 : 2;
    const args = ['-i', inputName];

    if (command === 'extract') args.push('-vn');

    if (outputName.endsWith('.mp3')) {
      args.push('-c:a', 'libmp3lame', '-b:a', `${bitrate}k`);
    } else if (outputName.endsWith('.aac') || outputName.endsWith('.m4a')) {
      args.push('-c:a', 'aac', '-b:a', `${bitrate}k`);
    } else if (outputName.endsWith('.ogg') || outputName.endsWith('.oga')) {
      args.push('-c:a', 'libvorbis', '-b:a', `${bitrate}k`);
    } else if (outputName.endsWith('.wav')) {
      args.push('-c:a', 'pcm_s16le');
    } else if (outputName.endsWith('.flac')) {
      args.push('-c:a', 'flac');
    } else if (outputName.endsWith('.webm')) {
      args.push('-c:a', 'libopus', '-b:a', `${bitrate}k`);
    }

    if (!outputName.endsWith('.wav') && !outputName.endsWith('.flac')) {
      args.push('-ar', String(sampleRate), '-ac', String(channels));
    }

    args.push(outputName);
    return args;
  }

  if (command === 'cut') {
    const start = Math.max(0, numberOption(options, 'start', 0));
    const end = Math.max(start + 0.1, numberOption(options, 'end', start + 10));
    const bitrate = numberOption(options, 'bitrate', 128);
    const args = ['-ss', String(start), '-to', String(end), '-i', inputName];

    if (outputName.endsWith('.mp3')) {
      args.push('-c:a', 'libmp3lame', '-b:a', `${bitrate}k`);
    } else if (outputName.endsWith('.wav')) {
      args.push('-c:a', 'pcm_s16le');
    } else {
      args.push('-c', 'copy');
    }

    args.push(outputName);
    return args;
  }

  if (command === 'gif') {
    const start = Math.max(0, numberOption(options, 'start', 0));
    const duration = Math.max(0.1, Math.min(15, numberOption(options, 'duration', 5)));
    const fps = Math.max(1, Math.min(24, numberOption(options, 'fps', 12)));
    const width = Math.max(120, Math.min(720, numberOption(options, 'width', 480)));
    return [
      '-ss', String(start),
      '-t', String(duration),
      '-i', inputName,
      '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`,
      '-loop', '0',
      outputName,
    ];
  }

  if (command === 'compress') {
    const resolution = stringOption(options, 'resolution', '720');
    const videoBitrate = numberOption(options, 'videoBitrate', 1000);
    const audioBitrate = numberOption(options, 'audioBitrate', 96);
    const scale =
      resolution === 'original'
        ? 'scale=-2:-2'
        : `scale=-2:${resolution === '480' ? 480 : resolution === '360' ? 360 : 720}`;

    return [
      '-i', inputName,
      '-vf', scale,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-b:v', `${videoBitrate}k`,
      '-c:a', 'aac',
      '-b:a', `${audioBitrate}k`,
      '-movflags', '+faststart',
      outputName,
    ];
  }

  throw new Error('Comando multimedia no admitido.');
}

export async function runMediaJob(
  command: string,
  file: File,
  options: Record<string, unknown>,
  onProgress?: (percent: number) => void,
): Promise<MediaOutput> {
  let instance: FFmpeg;
  try {
    instance = await getFFmpeg(onProgress);
  } catch (error) {
    ffmpeg = null;
    loadPromise = null;
    throw error;
  }

  const inputName = `input-${Date.now()}`;
  const extension = outputExtension(command, options);
  const outputName = `output-${Date.now()}.${extension}`;

  try {
    await instance.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
    const args = buildArgs(command, inputName, outputName, options);
    const code = await instance.exec(args);
    if (code !== 0) throw new Error(`FFmpeg terminó con código ${code}.`);

    const data = await instance.readFile(outputName);
    const outputData = data instanceof Uint8Array ? data : new Uint8Array(data as any);
    if (outputData.byteLength === 0) throw new Error('FFmpeg generó un archivo vacío.');

    await instance.deleteFile(inputName).catch(() => undefined);
    await instance.deleteFile(outputName).catch(() => undefined);

    return { data: outputData, name: outputName, extension };
  } catch (error) {
    await instance.deleteFile(inputName).catch(() => undefined);
    await instance.deleteFile(outputName).catch(() => undefined);
    ffmpeg = null;
    loadPromise = null;
    throw error;
  }
}

export function stopMediaWorker(): void {
  if (!ffmpeg) return;
  ffmpeg.terminate();
  ffmpeg = null;
  loadPromise = null;
}

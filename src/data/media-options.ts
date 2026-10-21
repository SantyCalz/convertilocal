/**
 * src/data/media-options.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { ProcessorOption } from '@/types/processor';

export const MEDIA_OPTIONS = {
  audioConvert: [
    { id: 'format', label: 'Formato de salida', type: 'select', defaultValue: 'mp3', choices: [{ value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' }, { value: 'ogg', label: 'OGG' }, { value: 'aac', label: 'AAC' }, { value: 'm4a', label: 'M4A' }, { value: 'flac', label: 'FLAC' }, { value: 'webm', label: 'WebM' }] },
    { id: 'bitrate', label: 'Bitrate', type: 'select', defaultValue: '128', choices: [{ value: '64', label: '64 kbps' }, { value: '96', label: '96 kbps' }, { value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }, { value: '256', label: '256 kbps' }, { value: '320', label: '320 kbps' }], help: 'Solo afecta a formatos con pérdida.' },
    { id: 'sampleRate', label: 'Frecuencia de muestreo', type: 'select', defaultValue: '44100', choices: [{ value: '22050', label: '22050 Hz' }, { value: '44100', label: '44100 Hz' }, { value: '48000', label: '48000 Hz' }] },
    { id: 'channels', label: 'Canales', type: 'select', defaultValue: 'stereo', choices: [{ value: 'stereo', label: 'Estéreo' }, { value: 'mono', label: 'Mono' }] },
  ] satisfies ProcessorOption[],

  audioExtract: [
    { id: 'format', label: 'Formato de salida', type: 'select', defaultValue: 'mp3', choices: [{ value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' }, { value: 'aac', label: 'AAC' }] },
    { id: 'bitrate', label: 'Bitrate', type: 'select', defaultValue: '128', choices: [{ value: '64', label: '64 kbps' }, { value: '96', label: '96 kbps' }, { value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }, { value: '256', label: '256 kbps' }, { value: '320', label: '320 kbps' }], help: 'Solo afecta a formatos con pérdida.' },
    { id: 'sampleRate', label: 'Frecuencia de muestreo', type: 'select', defaultValue: '44100', choices: [{ value: '22050', label: '22050 Hz' }, { value: '44100', label: '44100 Hz' }, { value: '48000', label: '48000 Hz' }] },
  ] satisfies ProcessorOption[],

  audioCut: [
    { id: 'start', label: 'Inicio', type: 'number', defaultValue: 0, min: 0, max: 86400, step: 0.1, unit: 's' },
    { id: 'end', label: 'Fin', type: 'number', defaultValue: 10, min: 0.1, max: 86400, step: 0.1, unit: 's' },
    { id: 'format', label: 'Formato de salida', type: 'select', defaultValue: 'mp3', choices: [{ value: 'mp3', label: 'MP3' }, { value: 'wav', label: 'WAV' }, { value: 'aac', label: 'AAC' }, { value: 'ogg', label: 'OGG' }] },
    { id: 'bitrate', label: 'Bitrate', type: 'select', defaultValue: '128', choices: [{ value: '64', label: '64 kbps' }, { value: '96', label: '96 kbps' }, { value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }, { value: '256', label: '256 kbps' }, { value: '320', label: '320 kbps' }], help: 'Solo afecta a formatos con pérdida.' },
  ] satisfies ProcessorOption[],

  videoToGif: [
    { id: 'start', label: 'Inicio', type: 'number', defaultValue: 0, min: 0, max: 3600, step: 0.1, unit: 's' },
    { id: 'duration', label: 'Duración', type: 'number', defaultValue: 5, min: 0.1, max: 15, step: 0.1, unit: 's' },
    { id: 'fps', label: 'FPS', type: 'number', defaultValue: 12, min: 1, max: 24, step: 1 },
    { id: 'width', label: 'Ancho', type: 'number', defaultValue: 480, min: 120, max: 720, step: 10, unit: 'px' },
  ] satisfies ProcessorOption[],

  videoCompress: [
    { id: 'resolution', label: 'Resolución', type: 'select', defaultValue: '720', choices: [{ value: 'original', label: 'Original' }, { value: '720', label: '720p' }, { value: '480', label: '480p' }, { value: '360', label: '360p' }] },
    { id: 'videoBitrate', label: 'Bitrate de video', type: 'select', defaultValue: '1000', choices: [{ value: '500', label: '500 kbps' }, { value: '1000', label: '1000 kbps' }, { value: '2000', label: '2000 kbps' }, { value: '4000', label: '4000 kbps' }] },
    { id: 'audioBitrate', label: 'Bitrate de audio', type: 'select', defaultValue: '96', choices: [{ value: '64', label: '64 kbps' }, { value: '96', label: '96 kbps' }, { value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }] },
  ] satisfies ProcessorOption[],

  videoCut: [
    { id: 'start', label: 'Inicio', type: 'number', defaultValue: 0, min: 0, max: 86400, step: 0.1, unit: 's' },
    { id: 'end', label: 'Fin', type: 'number', defaultValue: 10, min: 0.1, max: 86400, step: 0.1, unit: 's' },
    { id: 'format', label: 'Formato de salida', type: 'select', defaultValue: 'mp4', choices: [{ value: 'mp4', label: 'MP4' }, { value: 'webm', label: 'WebM' }] },
    { id: 'videoBitrate', label: 'Bitrate de video', type: 'select', defaultValue: '1000', choices: [{ value: '500', label: '500 kbps' }, { value: '1000', label: '1000 kbps' }, { value: '2000', label: '2000 kbps' }, { value: '4000', label: '4000 kbps' }] },
    { id: 'audioBitrate', label: 'Bitrate de audio', type: 'select', defaultValue: '96', choices: [{ value: '64', label: '64 kbps' }, { value: '96', label: '96 kbps' }, { value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }] },
  ] satisfies ProcessorOption[],
};

/**
 * src/data/media-tools.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { MediaTool, MediaToolConfig, MediaToolContent } from '@/types/media';
import contentData from './media-tools.json';
import { MEDIA_OPTIONS } from './media-options';

const MEDIA_CONTENT = contentData as MediaToolContent[];

const CONFIG: Record<string, MediaToolConfig> = {
  'mp3-a-wav': { processorId: 'audio-convert', accept: '.mp3,audio/mpeg', acceptLabel: 'MP3', actionLabel: 'Convertir a WAV', baseName: 'mp3-a-wav', multiple: true, maxSizeMB: 50, maxFiles: 20, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioConvert, fixedOptions: { format: 'wav' }, resultNote: 'WAV no usa compresión con pérdida, por lo que el archivo resultante suele ser más grande.' },
  'wav-a-mp3': { processorId: 'audio-convert', accept: '.wav,audio/wav', acceptLabel: 'WAV', actionLabel: 'Convertir a MP3', baseName: 'wav-a-mp3', multiple: true, maxSizeMB: 50, maxFiles: 20, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioConvert, fixedOptions: { format: 'mp3' }, resultNote: 'MP3 usa compresión con pérdida. Elige un bitrate alto para música.' },
  'ogg-a-mp3': { processorId: 'audio-convert', accept: '.ogg,.oga,audio/ogg', acceptLabel: 'OGG', actionLabel: 'Convertir a MP3', baseName: 'ogg-a-mp3', multiple: true, maxSizeMB: 50, maxFiles: 20, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioConvert, fixedOptions: { format: 'mp3' }, resultNote: 'Se re-codifica a MP3 para mejorar la compatibilidad.' },
  'm4a-a-mp3': { processorId: 'audio-convert', accept: '.m4a,audio/mp4,audio/x-m4a', acceptLabel: 'M4A', actionLabel: 'Convertir a MP3', baseName: 'm4a-a-mp3', multiple: true, maxSizeMB: 50, maxFiles: 20, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioConvert, fixedOptions: { format: 'mp3' }, resultNote: 'Ideal para grabaciones de móvil o bibliotecas M4A.' },
  'flac-a-wav': { processorId: 'audio-convert', accept: '.flac,audio/flac', acceptLabel: 'FLAC', actionLabel: 'Convertir a WAV', baseName: 'flac-a-wav', multiple: true, maxSizeMB: 50, maxFiles: 20, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioConvert, fixedOptions: { format: 'wav' }, resultNote: 'Conversión sin pérdida adicional.' },
  'mp4-a-mp3': { processorId: 'audio-extract', accept: '.mp4,video/mp4', acceptLabel: 'MP4', actionLabel: 'Extraer MP3', baseName: 'mp4-a-mp3', multiple: true, maxSizeMB: 100, maxFiles: 10, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioExtract, fixedOptions: { format: 'mp3' }, resultNote: 'Se extrae la pista de audio principal del video.' },
  'mp4-a-wav': { processorId: 'audio-extract', accept: '.mp4,video/mp4', acceptLabel: 'MP4', actionLabel: 'Extraer WAV', baseName: 'mp4-a-wav', multiple: true, maxSizeMB: 100, maxFiles: 10, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioExtract, fixedOptions: { format: 'wav' }, resultNote: 'Genera un WAV para edición o análisis.' },
  'webm-a-mp3': { processorId: 'audio-extract', accept: '.webm,video/webm', acceptLabel: 'WebM', actionLabel: 'Extraer MP3', baseName: 'webm-a-mp3', multiple: true, maxSizeMB: 100, maxFiles: 10, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioExtract, fixedOptions: { format: 'mp3' }, resultNote: 'Ideal para grabaciones web o videos WebM.' },
  'mp4-a-gif': { processorId: 'video-to-gif', accept: '.mp4,video/mp4', acceptLabel: 'MP4', actionLabel: 'Convertir a GIF', baseName: 'mp4-a-gif', multiple: true, maxSizeMB: 100, maxFiles: 5, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.videoToGif, resultNote: 'Usa clips cortos para evitar GIFs enormes.' },
  'comprimir-video': { processorId: 'video-compress', accept: '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime', acceptLabel: 'MP4, WebM o MOV', actionLabel: 'Comprimir video', baseName: 'video-comprimido', multiple: true, maxSizeMB: 100, maxFiles: 5, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.videoCompress, fixedOptions: { format: 'mp4' }, resultNote: 'La compresión consume CPU y RAM. Usa clips cortos en móviles.' },
  'cortar-audio': { processorId: 'audio-cut', accept: '.mp3,.wav,.ogg,.oga,.aac,.m4a,.flac,.webm,.mp4,.mov,audio/*,video/*', acceptLabel: 'Audio o video', actionLabel: 'Cortar audio', baseName: 'audio-recortado', multiple: true, maxSizeMB: 100, maxFiles: 10, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.audioCut, resultNote: 'Revisa inicio y fin en segundos antes de procesar.' },
  'cortar-video': { processorId: 'audio-cut', accept: '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime', acceptLabel: 'MP4, WebM o MOV', actionLabel: 'Cortar video', baseName: 'video-recortado', multiple: true, maxSizeMB: 100, maxFiles: 5, maxTotalMB: 100, previewMode: 'media', options: MEDIA_OPTIONS.videoCut, resultNote: 'Revisa inicio y fin en segundos antes de procesar.' },
};

export const MEDIA_TOOLS: MediaTool[] = MEDIA_CONTENT.map((content) => {
  const config = CONFIG[content.slug];
  if (!config) throw new Error(`Falta configuración de la herramienta multimedia: ${content.slug}`);
  return { ...content, ...config };
});

export function getMediaTool(slug: string): MediaTool | undefined {
  return MEDIA_TOOLS.find((tool) => tool.slug === slug);
}

export const MEDIA_TOOL_PATHS = MEDIA_TOOLS.map((tool) =>
  tool.slug === 'cortar-audio' || tool.slug === 'cortar-video' ? `/media/${tool.slug}` : `/convertir/${tool.slug}`,
);

export const MEDIA_SLUGS = new Set(['cortar-audio', 'cortar-video']);

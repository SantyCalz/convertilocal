/**
 * src/data/categories.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Category } from '@/types/tool';

export const CATEGORIES: Category[] = [
  {
    id: 'imagen',
    name: 'Imagen',
    description: 'JPG, PNG, WebP, AVIF, SVG y compresión sin perder calidad.',
    icon: 'image',
    accent: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'ring-emerald-200',
      hover: 'hover:border-emerald-300 hover:bg-emerald-50/60',
    },
  },
  {
    id: 'audio',
    name: 'Audio',
    description: 'MP3, WAV, OGG, M4A y extracción de audio desde vídeo.',
    icon: 'music',
    accent: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      ring: 'ring-sky-200',
      hover: 'hover:border-sky-300 hover:bg-sky-50/60',
    },
  },
  {
    id: 'video',
    name: 'Vídeo',
    description: 'MP4, WebM, GIF y compresión directamente en tu navegador.',
    icon: 'video',
    accent: {
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      ring: 'ring-violet-200',
      hover: 'hover:border-violet-300 hover:bg-violet-50/60',
    },
  },
  {
    id: 'documentos',
    name: 'Documentos',
    description: 'PDF, Word, texto, Markdown y OCR de documentos escaneados.',
    icon: 'file-text',
    accent: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'ring-amber-200',
      hover: 'hover:border-amber-300 hover:bg-amber-50/60',
    },
  },
  {
    id: 'datos',
    name: 'Datos',
    description: 'CSV, JSON, Excel y conversiones entre formatos tabulares.',
    icon: 'table',
    accent: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      ring: 'ring-rose-200',
      hover: 'hover:border-rose-300 hover:bg-rose-50/60',
    },
  },
  {
    id: 'texto',
    name: 'Texto',
    description: 'Markdown, HTML, limpieza y análisis de texto.',
    icon: 'clipboard',
    accent: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      ring: 'ring-indigo-200',
      hover: 'hover:border-indigo-300 hover:bg-indigo-50/60',
    },
  },
  {
    id: 'archivos',
    name: 'Archivos',
    description: 'Comprime y extrae ZIP, TAR y GZ sin límites de subida.',
    icon: 'archive',
    accent: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      ring: 'ring-cyan-200',
      hover: 'hover:border-cyan-300 hover:bg-cyan-50/60',
    },
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

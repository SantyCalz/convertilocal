/**
 * src/types/tool.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { IconName } from './icon';

export type CategoryId = 'imagen' | 'audio' | 'video' | 'documentos' | 'datos' | 'texto' | 'archivos';

export type ToolStatus = 'planned' | 'beta' | 'stable';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: IconName;
  /** Clases estáticas para que Tailwind las incluya en el build. */
  accent: {
    bg: string;
    text: string;
    ring: string;
    hover: string;
  };
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  /** Extensiones o mime-types de entrada. */
  accepts: string[];
  /** Extensiones o mime-types de salida. */
  outputs: string[];
  status: ToolStatus;
  icon: IconName;
  keywords: string[];
  /** Ruta pública cuando la herramienta ya existe. Ausente si es "próximamente". */
  href?: string;
  /** Oculto en grillas y búsquedas (páginas de laboratorio, QA). */
  hidden?: boolean;
}

export interface RecentToolEntry {
  id: string;
  usedAt: number;
}

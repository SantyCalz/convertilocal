/**
 * src/content/legal/types.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/** Bloque de contenido reutilizable dentro de un documento legal. */
export interface LegalBlock {
  /** Tipo de bloque: párrafo, lista o tabla de datos clave. */
  type: 'paragraph' | 'list' | 'facts' | 'note';
  /** Contenido del bloque. En `facts` es una lista de pares [término, valor]. */
  content: string | string[] | [string, string][];
}

/** Sección numerada de un documento legal. */
export interface LegalSection {
  /** Identificador estable para el ancla del encabezado. */
  id: string;
  title: string;
  blocks: LegalBlock[];
}

/** Documento legal completo tal y como se renderiza en la página. */
export interface LegalDocument {
  /** Ruta pública de la página. */
  path: string;
  title: string;
  shortTitle: string;
  /** Meta description de la página. */
  description: string;
  /** Fecha ISO de la última revisión. */
  updated: string;
  /** Texto introductorio sobre la página. */
  intro: string;
  sections: LegalSection[];
}

/** Enlace relacionado que se muestra al final del documento. */
export interface LegalLink {
  label: string;
  href: string;
}

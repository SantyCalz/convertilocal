/**
 * src/content.config.ts
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Colección de contenido.
 *
 * `src/content/legal/` guarda los textos legales como módulos TypeScript
 * (se importan directamente), más este README. La colección se declara aquí
 * para que Astro no genere una automáticamente y avise de que está obsoleto.
 */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({}).passthrough(),
});

export const collections = { legal };

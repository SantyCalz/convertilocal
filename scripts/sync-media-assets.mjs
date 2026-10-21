/**
 * scripts/sync-media-assets.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const target = join(root, 'public', 'assets', 'wasm');

if (!existsSync(source)) {
  console.error('No se encontró @ffmpeg/core. Ejecuta npm install primero.');
  process.exit(1);
}

mkdirSync(target, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  copyFileSync(join(source, file), join(target, file));
}

console.log('✓ Assets de ffmpeg.wasm sincronizados en public/assets/wasm/.');

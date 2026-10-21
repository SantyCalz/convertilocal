/**
 * Añade la cabecera SPDX-License-Identifier a los ficheros propios del proyecto.
 *
 * Uso: node scripts/add-spdx-headers.mjs [--check]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.astro', '.mjs', '.js', '.css']);

const CHECK_ONLY = process.argv.includes('--check');

const COPYRIGHT = 'Copyright (C) 2026 ConvertiLocal contributors';
const SPDX = 'SPDX-License-Identifier: AGPL-3.0-only';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Devuelve la cabecera propia del fichero, o null si ya existe. */
function buildHeader(relative, body) {
  const banner = ` * ${relative}\n * ${COPYRIGHT}\n * ${SPDX}\n`;

  if (extname(relative) === '.astro') {
    // Los .astro empiezan por el bloque frontmatter: la cabecera va dentro.
    const marker = '---\n';
    if (!body.startsWith(marker)) return null;
    return `---\n/**\n${banner} */\n${body.slice(marker.length)}`;
  }

  if (extname(relative) === '.css') {
    return `/*\n${banner} */\n${body}`;
  }

  // TypeScript y JavaScript: cabecera de bloque antes de cualquier código.
  if (body.startsWith('/*')) {
    const end = body.indexOf('*/');
    if (end === -1) return null;
    const existing = body.slice(0, end + 2);
    if (existing.includes('SPDX-License-Identifier')) return null;
    return `${existing}\n/**\n${banner} */\n${body.slice(end + 2).replace(/^\n+/, '')}`;
  }

  if (body.startsWith('//')) {
    const lines = body.split('\n');
    const end = lines.findIndex((line) => !line.trimStart().startsWith('//'));
    const head = lines.slice(0, end === -1 ? lines.length : end).join('\n');
    const rest = end === -1 ? '' : lines.slice(end).join('\n');
    return `/**\n${banner} */\n${head}\n${rest}`;
  }

  return `/**\n${banner} */\n${body}`;
}

let changed = 0;
let skipped = 0;
const problems = [];

for (const target of TARGETS) {
  for (const file of walk(join(ROOT, target))) {
    if (!EXTENSIONS.has(extname(file))) continue;

    const relative = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    const body = readFileSync(file, 'utf8');
    if (body.includes('SPDX-License-Identifier')) {
      skipped += 1;
      continue;
    }

    const next = buildHeader(relative, body);
    if (next === null) {
      problems.push(`${relative}: no se pudo insertar la cabecera`);
      continue;
    }

    if (next === body) {
      skipped += 1;
      continue;
    }

    if (CHECK_ONLY) {
      problems.push(`${relative}: falta la cabecera SPDX`);
      changed += 1;
      continue;
    }

    writeFileSync(file, next, 'utf8');
    changed += 1;
  }
}

if (CHECK_ONLY) {
  if (problems.length > 0) {
    console.error(`\n✗ ${problems.length} fichero(s) sin cabecera SPDX:\n`);
    for (const problem of problems.slice(0, 20)) console.error(`  · ${problem}`);
    if (problems.length > 20) console.error(`  … y ${problems.length - 20} más`);
    process.exit(1);
  }
  console.log(`✓ Todos los ficheros propios tienen cabecera SPDX (${skipped} revisados).`);
} else {
  console.log(`✓ Cabeceras SPDX añadidas: ${changed}. Sin tocar: ${skipped}.`);
  if (problems.length > 0) {
    console.error(`⚠ ${problems.length} fichero(s) no se pudieron modificar:`);
    for (const problem of problems) console.error(`  · ${problem}`);
    process.exit(1);
  }
}

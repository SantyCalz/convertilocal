/**
 * Genera el inventario de licencias de terceros.
 *
 * Produce dos artefactos:
 *   - THIRD_PARTY_LICENSES.md  (raíz del repositorio)
 *   - public/licencias/terceros.txt  (servido desde el propio dominio)
 *
 * Se ejecuta en `prebuild`. Es determinista: el mismo árbol de `node_modules`
 * genera siempre el mismo documento, byte a byte.
 *
 * Uso: node scripts/generate-third-party.mjs [--check]
 */
/**
 * scripts/generate-third-party.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');
const require = createRequire(import.meta.url);

/**
 * Origen público del sitio, para los enlaces absolutos del documento.
 * Debe coincidir con `src/data/site.ts` y con `astro.config.mjs`.
 */
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://convertilocal.vercel.app')
  .trim()
  .replace(/\/$/, '');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

/** Ficheros de licencia que se copian a `public/licencias/` y a la raíz. */
const LICENSE_TEXTS = [
  { file: 'public/licencias/agpl-3.0.txt', id: 'AGPL-3.0-only', url: 'https://www.gnu.org/licenses/agpl-3.0.txt' },
  { file: 'public/licencias/gpl-2.0.txt', id: 'GPL-2.0-only', url: 'https://www.gnu.org/licenses/gpl-2.0.txt' },
  { file: 'public/licencias/gpl-3.0.txt', id: 'GPL-3.0-only', url: 'https://www.gnu.org/licenses/gpl-3.0.txt' },
  { file: 'public/licencias/lgpl-2.1.txt', id: 'LGPL-2.1-only', url: 'https://www.gnu.org/licenses/lgpl-2.1.txt' },
  { file: 'public/licencias/apache-2.0.txt', id: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0.txt' },
  { file: 'public/licencias/mit.txt', id: 'MIT', url: 'https://opensource.org/license/mit' },
  { file: 'public/licencias/bsd-3-clause.txt', id: 'BSD-3-Clause', url: 'https://opensource.org/license/bsd-3-clause' },
  { file: 'public/licencias/isc.txt', id: 'ISC', url: 'https://opensource.org/license/isc-license-txt' },
];

/** Normaliza el campo `license` de un package.json a un identificador SPDX legible. */
function normalizeLicense(value) {
  if (!value) return 'UNKNOWN';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(' OR ');
  if (value.type) return value.type;
  return 'UNKNOWN';
}

/**
 * Detecta la licencia leyendo el fichero de licencia del paquete.
 *
 * Necesario cuando el `package.json` apunta a un fichero en lugar de declarar
 * un SPDX, como hace `@imgly/background-removal` ("SEE LICENSE IN LICENSE.md"),
 * que en realidad es AGPL-3.0.
 */
function detectLicenseFromFile(file) {
  if (!file) return null;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }

  if (/GNU AFFERO GENERAL PUBLIC LICENSE/i.test(text)) return 'AGPL-3.0-only';
  if (/GNU LESSER GENERAL PUBLIC LICENSE/i.test(text)) {
    const version = /Version (\d\.\d)/i.exec(text)?.[1];
    return version ? `LGPL-${version}-only` : 'LGPL';
  }
  if (/GNU GENERAL PUBLIC LICENSE/i.test(text)) {
    const version = /Version (\d\.\d)/i.exec(text)?.[1];
    return version ? `GPL-${version}-only` : 'GPL';
  }
  if (/Apache License/i.test(text) && /Version 2\.0/i.test(text)) return 'Apache-2.0';
  if (/Permission is hereby granted, free of charge/i.test(text)) return 'MIT';
  if (/Redistribution and use in source and binary forms/i.test(text)) return 'BSD-3-Clause';
  if (/Permission to use, copy, modify, and\/or distribute/i.test(text)) return 'ISC';
  if (/Mozilla Public License/i.test(text)) return 'MPL-2.0';

  return null;
}

/** Devuelve el primer fichero de licencia que exista en el paquete. */
function findLicenseFile(dir) {
  const candidates = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'LICENCE',
    'LICENCE.md',
    'LICENCE.txt',
    'COPYING',
    'COPYING.txt',
    'license',
    'license.md',
  ];
  for (const candidate of candidates) {
    const full = join(dir, candidate);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  try {
    const entries = readdirSync(dir);
    const match = entries.find(
      (name) => /^(licen[cs]e|copying)/i.test(name) && statSync(join(dir, name)).isFile(),
    );
    return match ? join(dir, match) : null;
  } catch {
    return null;
  }
}

/** Recorre `node_modules` y recoge todos los paquetes instalados. */
function collectPackages(dir, prefix = '', out = []) {
  if (!existsSync(dir)) return out;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name === '.bin' || entry.name === '.cache') continue;

    const full = join(dir, entry.name);
    if (entry.name.startsWith('@')) {
      collectPackages(full, `${prefix}${entry.name}/`, out);
      continue;
    }

    const manifest = join(full, 'package.json');
    if (existsSync(manifest)) {
      try {
        const data = JSON.parse(readFileSync(manifest, 'utf8'));
        out.push({ name: `${prefix}${entry.name}`, dir: full, data });
      } catch {
        /* paquete ilegible: se ignora */
      }
    }

    collectPackages(join(full, 'node_modules'), '', out);
  }

  return out;
}

const installed = collectPackages(join(ROOT, 'node_modules'));

const direct = new Set(Object.keys(pkg.dependencies ?? {}));
const directDev = new Set(Object.keys(pkg.devDependencies ?? {}));

/** Marca los paquetes que acaban en el bundle del navegador. */
const CLIENT_PACKAGES = new Set([
  '@ffmpeg/core',
  '@ffmpeg/ffmpeg',
  '@ffmpeg/util',
  '@imgly/background-removal',
  '@jsquash/avif',
  'dompurify',
  'fflate',
  'heic2any',
  'js-yaml',
  'marked',
  'onnxruntime-web',
  'pdf-lib',
  'pdfjs-dist',
  'turndown',
  'xlsx',
]);

const packages = installed
  .filter((item) => direct.has(item.name) || directDev.has(item.name))
  .sort((a, b) => a.name.localeCompare(b.name));

const rows = packages.map((item) => {
  const licenseFile = findLicenseFile(item.dir);
  const declared = normalizeLicense(item.data.license);
  const needsDetection = /SEE LICENSE|UNKNOWN|Custom/i.test(declared);
  const detected = needsDetection ? detectLicenseFromFile(licenseFile) : null;

  return {
    name: item.name,
    version: item.data.version ?? '?',
    license: detected ?? declared,
    declaredLicense: declared,
    repository:
      typeof item.data.repository === 'string'
        ? item.data.repository
        : (item.data.repository?.url ?? ''),
    homepage: item.data.homepage ?? '',
    kind: direct.has(item.name) ? 'directa' : 'dev',
    client: CLIENT_PACKAGES.has(item.name),
    licenseFile,
  };
});

const totalInstalled = installed.length;
const counts = {};
for (const row of rows) counts[row.license] = (counts[row.license] ?? 0) + 1;

/**
 * Fecha del documento. Se toma del último commit para que el resultado sea
 * reproducible: regenerarlo dos veces con el mismo árbol da el mismo fichero.
 */
function resolveDate() {
  try {
    const { execFileSync } = require('node:child_process');
    const iso = execFileSync('git', ['log', '-1', '--format=%cI'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (iso) return iso.slice(0, 10);
  } catch {
    /* sin git: se usa la versión del paquete */
  }
  return `v${pkg.version}`;
}

const generated = resolveDate();

/** Bloque de tabla markdown. */
function renderTable() {
  const header = '| Componente | Versión | Licencia | ¿Se distribuye? | Origen |';
  const separator = '| --- | --- | --- | --- | --- |';
  const body = rows.map(
    (row) =>
      `| \`${row.name}\` | ${row.version} | ${row.license} | ${row.client ? 'Sí' : 'No'} | ${
        row.repository || row.homepage || '—'
      } |`,
  );
  return [header, separator, ...body].join('\n');
}

function renderMarkdown() {
  const copyleft = rows.filter((row) => /AGPL|GPL|LGPL|MPL|SSPL|CC-BY-NC/i.test(row.license));

  return `# Licencias de terceros

> Generado automáticamente por \`scripts/generate-third-party.mjs\` el ${generated}.
> No editar a mano: los cambios se pierden en el siguiente build.

Este documento lista las dependencias del proyecto y sus licencias. El proyecto completo se
publica bajo la **GNU Affero General Public License v3.0 únicamente** (\`AGPL-3.0-only\`); el
texto canónico está en [\`LICENSE\`](LICENSE) y la auditoría completa en
[\`docs/LICENSE_AUDIT.md\`](docs/LICENSE_AUDIT.md).

## Resumen

- Paquetes instalados en \`node_modules\`: **${totalInstalled}**.
- Dependencias directas de producción: **${rows.filter((r) => r.kind === 'directa').length}**.
- Dependencias de desarrollo: **${rows.filter((r) => r.kind === 'dev').length}**.
- Componentes con copyleft o copyleft limitado: **${copyleft.length}**.

${Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .map(([license, count]) => `- ${license}: ${count}`)
  .join('\n')}

## Dependencias con copyleft

${copyleft.length === 0 ? '_Ninguna._' : copyleft.map((row) => `- \`${row.name}\` ${row.version} — ${row.license}`).join('\n')}

El detalle de las obligaciones que generan (copia de la licencia, código fuente correspondiente,
aviso de red de la AGPL §13) está en [\`/licencias\`](${SITE_URL}/licencias).

## Inventario

${renderTable()}

## Textos de licencia

Se sirven en \`/licencias/\` y en la raíz del repositorio:

| Licencia | Fichero |
| --- | --- |
${LICENSE_TEXTS.map((item) => `| ${item.id} | \`${item.file.replace('public/', '')}\` |`).join('\n')}

## Aviso de marcas

«ConvertiLocal» y el diseño del sitio son marcas de sus titulares y no están cubiertos por
ninguna de las licencias anteriores. «FFmpeg» es una marca de Fabrice Bellard. Los nombres de
los proyectos citados pertenecen a sus respectivos autores y se mencionan con fines meramente
informativos.
`;
}

function renderPlainText() {
  return `LICENCIAS DE TERCEROS — CONVERTI LOCAL
Generado por scripts/generate-third-party.mjs el ${generated}

Este sitio se publica bajo la GNU Affero General Public License v3.0 unicamente (AGPL-3.0-only).
El texto completo esta en /licencias y en la raiz del repositorio (LICENSE).

El codigo fuente correspondiente de la version desplegada esta disponible en:
  https://github.com/SantyCalz/convertilocal

DEPENDENCIAS DIRECTAS
${rows
  .filter((row) => row.kind === 'directa')
  .map((row) => `  ${row.name}@${row.version}  ${row.license}${row.client ? '  [se distribuye]' : ''}`)
  .join('\n')}

DEPENDENCIAS CON COPYLEFT
${rows
  .filter((row) => /AGPL|GPL|LGPL|MPL|SSPL/i.test(row.license))
  .map((row) => `  ${row.name}@${row.version}  ${row.license}`)
  .join('\n')}

TEXTOS DE LICENCIA DISPONIBLES EN /licencias/
${LICENSE_TEXTS.map((item) => `  ${item.file.replace('public/licencias/', '')}  ${item.id}`).join('\n')}

AVISO DE MARCAS
  "ConvertiLocal" y el diseno del sitio son marcas de sus titulares y no estan cubiertos por
  ninguna de las licencias anteriores. "FFmpeg" es una marca de Fabrice Bellard. Los nombres
  de los proyectos citados pertenecen a sus respectivos autores.
`;
}

const outputs = [
  { path: join(ROOT, 'THIRD_PARTY_LICENSES.md'), content: renderMarkdown() },
  { path: join(ROOT, 'public', 'licencias', 'terceros.txt'), content: renderPlainText() },
  {
    path: join(ROOT, 'src', 'content', 'legal', 'third-party.json'),
    content: `${JSON.stringify(
      {
        generated,
        totalInstalled,
        rows: rows.map((row) => ({
          name: row.name,
          version: row.version,
          license: row.license,
          client: row.client,
          kind: row.kind,
          repository: row.repository || row.homepage,
        })),
      },
      null,
      2,
    )}\n`,
  },
];

let failed = false;

mkdirSync(join(ROOT, 'public', 'licencias'), { recursive: true });

for (const output of outputs) {
  const relative = output.path.slice(ROOT.length + 1).replace(/\\/g, '/');
  const current = existsSync(output.path) ? readFileSync(output.path, 'utf8') : null;

  if (current === output.content) {
    console.log(`  · ${relative} ya está al día`);
    continue;
  }

  if (CHECK_ONLY) {
    console.error(`  ✗ ${relative} está desactualizado`);
    failed = true;
    continue;
  }

  writeFileSync(output.path, output.content, 'utf8');
  console.log(`  ✓ ${relative} generado`);
}

if (CHECK_ONLY) {
  if (failed) process.exit(1);
  console.log('✓ Inventario de licencias de terceros al día.');
} else {
  console.log(
    `✓ Inventario de licencias generado: ${rows.length} dependencias directas y de desarrollo ` +
      `de ${totalInstalled} paquetes instalados.`,
  );
}

/**
 * Control de cumplimiento legal del sitio.
 *
 * Falla si:
 *   1. el fichero LICENSE no es el texto canónico de la AGPL-3.0;
 *   2. alguna página compilada carece del pie legal obligatorio;
 *   3. alguna página compilada contiene marcadores de plantilla sin resolver;
 *   4. los bundles de dist/ referencian hosts externos no autorizados.
 *
 * Uso: node scripts/check-legal.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

const errors = [];
const warnings = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecuta "npm run build" antes de verificar el cumplimiento legal.');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 1. El fichero LICENSE debe ser el texto canónico de la AGPL-3.0.
 * ------------------------------------------------------------------ */

const LICENSE_PATH = join(ROOT, 'LICENSE');
const CANONICAL_PATH = join(ROOT, 'public', 'licencias', 'agpl-3.0.txt');

if (!existsSync(LICENSE_PATH)) {
  fail('No existe el fichero LICENSE en la raíz del repositorio.');
} else {
  const license = readFileSync(LICENSE_PATH, 'utf8');

  const REQUIRED_MARKERS = [
    'GNU AFFERO GENERAL PUBLIC LICENSE',
    'Version 3, 19 November 2007',
    '13. Remote Network Interaction',
    'Copyright (C) 2007 Free Software Foundation, Inc.',
  ];

  for (const marker of REQUIRED_MARKERS) {
    if (!license.includes(marker)) {
      fail(`LICENSE no contiene el encabezado esperado de la AGPL-3.0: «${marker}»`);
    }
  }

  if (license.includes('&lt;') || license.includes('&gt;')) {
    fail('LICENSE contiene entidades HTML escapadas: debe ser el texto canónico sin transformar.');
  }

  if (existsSync(CANONICAL_PATH)) {
    const canonical = readFileSync(CANONICAL_PATH, 'utf8');
    if (license !== canonical) {
      fail('LICENSE no coincide con el texto canónico de la AGPL-3.0 (public/licencias/agpl-3.0.txt).');
    }
  } else {
    warn('No se encontró public/licencias/agpl-3.0.txt para contrastar el fichero LICENSE.');
  }
}

/* ------------------------------------------------------------------ *
 * 2 y 3. Cada página compilada debe llevar el pie legal y no debe
 *        contener marcadores de plantilla sin resolver.
 * ------------------------------------------------------------------ */

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));

/** Marcadores que delatan un texto legal sin cerrar. */
const PLACEHOLDERS = [
  { name: 'marcador doble corchete', re: /\[\[[^\]]{1,80}\]\]/g },
  { name: 'TODO', re: /\bTODO\b/g },
  { name: 'OWNER_NAME', re: /\bOWNER_NAME\b/g },
  { name: 'PLACEHOLDER', re: /\bPLACEHOLDER\b/g },
  { name: 'lorem ipsum', re: /lorem ipsum/gi },
  { name: 'entre corchetes sin resolver', re: /\[[A-ZÁÉÍÓÚÑ][^\]\n]{4,60}\]/g },
];

/** Fragmentos que identifican el pie legal obligatorio. */
const FOOTER_MARKERS = [
  { name: 'enlace a /licencias', re: /href="\/licencias"/ },
  { name: 'mención a AGPL-3.0', re: /AGPL-3\.0/ },
  { name: 'enlace al código fuente', re: /href="https:\/\/github\.com\/SantyCalz\/convertilocal/ },
];

let checkedPages = 0;
let skippedPages = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = file.slice(DIST.length + 1).replace(/\\/g, '/');

  // Las páginas de redirección generadas por Astro no llevan pie legal.
  if (/http-equiv="refresh"/i.test(html)) {
    skippedPages += 1;
    continue;
  }

  checkedPages += 1;

  for (const marker of FOOTER_MARKERS) {
    if (!marker.re.test(html)) {
      fail(`${relative}: falta el pie legal (${marker.name}).`);
    }
  }

  for (const placeholder of PLACEHOLDERS) {
    const matches = html.match(placeholder.re);
    if (!matches) continue;
    for (const match of [...new Set(matches)].slice(0, 3)) {
      fail(`${relative}: marcador de plantilla sin resolver (${placeholder.name}): ${match.slice(0, 50)}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. Los bundles no deben referenciar hosts externos no autorizados.
 * ------------------------------------------------------------------ */

/**
 * Hosts permitidos como subrecursos externos.
 *
 *   - pagead2.googlesyndication.com: script de Google AdSense (autorizado).
 *   - staticimgly.com: valor por defecto del esquema de @imgly; el sitio lo
 *     sustituye por /assets/imgly/, por lo que nunca se solicita.
 *   - unpkg.com: CORE_URL por defecto de @ffmpeg/ffmpeg; el sitio lo
 *     sustituye por /assets/wasm/ffmpeg-core.js.
 */
const ALLOWED_HOSTS = new Set([
  'pagead2.googlesyndication.com',
  'staticimgly.com',
  'unpkg.com',
]);

/**
 * Patrones que implican una petición real a la red.
 *
 * No basta con buscar cualquier URL: los bundles de terceros contienen
 * namespaces XML (schemas.openxmlformats.org), enlaces a documentación
 * (developer.mozilla.org) y fixtures de test (https://a#б). Solo interesan las
 * URLs que se piden de verdad.
 */
const REQUEST_PATTERNS = [
  { name: 'fetch()', re: /\bfetch\(\s*["'`](https?:\/\/[^"'`\s]+)/gi },
  { name: 'importScripts()', re: /\bimportScripts\(\s*["'`](https?:\/\/[^"'`\s]+)/gi },
  { name: 'new URL()', re: /\bnew\s+URL\(\s*["'`](https?:\/\/[^"'`\s]+)/gi },
  { name: 'src=', re: /\bsrc\s*=\s*["'`](https?:\/\/[^"'`\s]+)/gi },
  { name: 'location.href', re: /\blocation\.(?:href|replace)\(\s*["'`](https?:\/\/[^"'`\s]+)/gi },
];

/** Host plausible: al menos dos etiquetas y solo caracteres ASCII. */
function isRealHost(host) {
  if (!host.includes('.')) return false;
  if (!/^[a-z0-9.-]+$/i.test(host)) return false;
  return host.split('.').filter(Boolean).length >= 2;
}

const hostsFound = new Map();
let bundlesScanned = 0;

for (const file of walk(DIST).filter((f) => /\.(js|mjs|css)$/i.test(f))) {
  bundlesScanned += 1;
  const text = readFileSync(file, 'utf8');
  const relative = file.slice(DIST.length + 1).replace(/\\/g, '/');

  for (const { name, re } of REQUEST_PATTERNS) {
    re.lastIndex = 0;
    for (const match of text.matchAll(re)) {
      let host;
      try {
        host = new URL(match[1]).host.toLowerCase();
      } catch {
        continue;
      }
      if (!isRealHost(host)) continue;
      if (!hostsFound.has(host)) hostsFound.set(host, new Set());
      hostsFound.get(host).add(`${relative} (${name})`);
    }
  }
}

for (const [host, files] of hostsFound) {
  if (ALLOWED_HOSTS.has(host)) continue;
  fail(
    `Petición a un host externo no autorizado en los bundles: ${host} (en ${[...files][0]}). ` +
      'Añádelo a la lista permitida solo si está autorizado.',
  );
}

/* Subrecursos externos declarados en el HTML (scripts y hojas de estilo). */
const OWN_HOSTS = new Set(['convertilocal.com', 'www.convertilocal.com']);

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = file.slice(DIST.length + 1).replace(/\\/g, '/');

  const subresources = [
    ...html.matchAll(/<script[^>]*\ssrc\s*=\s*"(https?:\/\/[^"]+)"/gi),
    ...html.matchAll(/<link[^>]*\shref\s*=\s*"(https?:\/\/[^"]+)"[^>]*\srel\s*=\s*"stylesheet"/gi),
  ];

  for (const match of subresources) {
    let host;
    try {
      host = new URL(match[1]).host.toLowerCase();
    } catch {
      continue;
    }
    if (!isRealHost(host)) continue;
    if (OWN_HOSTS.has(host) || ALLOWED_HOSTS.has(host)) continue;
    fail(`${relative}: subrecurso externo no autorizado: ${match[1].slice(0, 80)}`);
  }
}

/* ------------------------------------------------------------------ *
 * Resultado
 * ------------------------------------------------------------------ */

if (errors.length > 0) {
  console.error(`\n✗ Cumplimiento legal inválido (${errors.length}):\n`);
  for (const error of errors) console.error(`  · ${error}`);
  if (warnings.length > 0) {
    console.error('\nAvisos:');
    for (const warning of warnings) console.error(`  · ${warning}`);
  }
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Cumplimiento legal verificado: LICENSE AGPL-3.0 correcto, ` +
    `${checkedPages} páginas con pie legal y sin marcadores de plantilla ` +
    `(${skippedPages} redirecciones excluidas) y ${bundlesScanned} bundles sin peticiones ` +
    'a hosts externos no autorizados.',
);
if (warnings.length > 0) {
  console.log('Avisos:');
  for (const warning of warnings) console.log(`  · ${warning}`);
}
console.log('');

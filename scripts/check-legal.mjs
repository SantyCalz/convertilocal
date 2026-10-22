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

/**
 * Origen público del sitio. Debe coincidir con el que usan las canónicas,
 * el sitemap y `robots.txt` (variable `PUBLIC_SITE_URL`).
 */
const CANONICAL_ORIGIN = (process.env.PUBLIC_SITE_URL ?? 'https://convertilocal.vercel.app')
  .trim()
  .replace(/\/$/, '');

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
const OWN_HOSTS = new Set([new URL(CANONICAL_ORIGIN).host, `www.${new URL(CANONICAL_ORIGIN).host}`]);

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
 * 5. Origen canónico: todas las páginas deben usar PUBLIC_SITE_URL.
 * ------------------------------------------------------------------ */

let canonicalChecked = 0;
const wrongOrigin = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relative = file.slice(DIST.length + 1).replace(/\\/g, '/');

  // Las páginas de redirección ya se excluyeron del conteo anterior.
  if (/http-equiv="refresh"/i.test(html)) continue;

  canonicalChecked += 1;

  // Todas las URL absolutas del documento deben pertenecer al origen público.
  const absolutes = [
    ...html.matchAll(/(?:rel="canonical"\s+href|property="og:(?:url|image)"\s+content)="(https?:\/\/[^"]+)"/g),
  ].map((match) => match[1]);

  for (const absolute of absolutes) {
    let origin;
    try {
      origin = new URL(absolute).origin;
    } catch {
      continue;
    }
    if (origin === CANONICAL_ORIGIN) continue;
    if (!wrongOrigin.has(origin)) wrongOrigin.set(origin, new Set());
    wrongOrigin.get(origin).add(relative);
  }
}

for (const [origin, files] of wrongOrigin) {
  fail(
    `Origen canónico distinto de PUBLIC_SITE_URL (${CANONICAL_ORIGIN}): ${origin} ` +
      `(en ${[...files][0]}). Toda URL absoluta del sitio debe usar el mismo origen.`,
  );
}

/* ------------------------------------------------------------------ *
 * 6. Verificación de producción: el código fuente debe ser público.
 *
 *    La AGPL-3.0 §13 obliga a que quien interactúe con el sitio por red
 *    pueda obtener el código fuente. Con el repositorio en privado, o con
 *    el release de la GPL-2.0 ausente, la obligación no queda satisfecha.
 * ------------------------------------------------------------------ */

const SKIP_PRODUCTION = /^(1|true|yes)$/i.test(process.env.SKIP_PRODUCTION_CHECK ?? '');
const PRODUCTION_URL = CANONICAL_ORIGIN;
const REPO_URL = (
  process.env.PUBLIC_REPO_URL ?? 'https://github.com/SantyCalz/convertilocal'
).replace(/\/$/, '');
const RELEASE_URL = (
  process.env.PUBLIC_SOURCE_RELEASE_URL ??
  'https://github.com/SantyCalz/convertilocal/releases/tag/corresponding-source-v1.0.0'
).replace(/\/$/, '');

/**
 * Hosts donde puede estar publicado el sitio. El primero es el origen
 * público configurado; los demás son el despliegue de Vercel, útil si el
 * dominio definitivo todavía no resuelve.
 */
const PRODUCTION_CANDIDATES = [
  PRODUCTION_URL,
  'https://convertilocal.vercel.app',
].filter((url, index, list) => url && list.indexOf(url) === index);

/** Un subdominio de despliegue no es un «dominio personalizado»: no exige DNS propio. */
function isCustomDomain(host) {
  return !/\.(vercel\.app|pages\.dev|netlify\.app)$/i.test(host);
}

/** Petición HEAD sin autenticación, con un tiempo de espera razonable. */
async function probe(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'convertilocal-deploy-check' },
    });
    clearTimeout(timer);
    return { ok: response.ok, status: response.status, error: null };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

if (SKIP_PRODUCTION) {
  console.log('  · Verificación de producción omitida (SKIP_PRODUCTION_CHECK).');
} else {
  console.log('\n  Verificando que el código fuente es accesible sin autenticación…');

  // El SHA desplegado se lee del propio sitio publicado.
  let deployedSha = '';
  let deployedHost = '';

  for (const candidate of PRODUCTION_CANDIDATES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${candidate}/licencias`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'convertilocal-deploy-check' },
      });
      clearTimeout(timer);
      if (!response.ok) continue;
      const html = await response.text();
      deployedSha = /github\.com\/[^/]+\/[^/]+\/tree\/([0-9a-f]{7,40})/.exec(html)?.[1] ?? '';
      deployedHost = candidate;
      break;
    } catch {
      // Se prueba el siguiente candidato.
    }
  }

  if (!deployedHost) {
    warn(
      `No se pudo leer /licencias en ninguno de los hosts de producción ` +
        `(${PRODUCTION_CANDIDATES.join(', ')}). No se comprueba el SHA desplegado.`,
    );
  } else if (!deployedSha) {
    warn(`${deployedHost}/licencias no enlaza a ningún commit: el enlace al código fuente falta.`);
  } else if (deployedHost !== PRODUCTION_URL) {
    // Solo avisa si el origen configurado es un dominio propio: un
    // subdominio de despliegue no depende de un DNS que el proyecto controle.
    const configuredHost = new URL(PRODUCTION_URL).host;
    if (isCustomDomain(configuredHost)) {
      warn(
        `El dominio configurado ${PRODUCTION_URL} no responde; la verificación se ha hecho ` +
          `contra ${deployedHost}. Revisa el DNS antes de publicar.`,
      );
    } else {
      warn(
        `El origen configurado ${PRODUCTION_URL} no responde; la verificación se ha hecho ` +
          `contra ${deployedHost}.`,
      );
    }
  }

  const targets = [
    { name: 'repositorio del código fuente', url: REPO_URL },
    {
      name: 'código fuente de la versión desplegada',
      url: deployedSha ? `${REPO_URL}/tree/${deployedSha}` : '',
    },
    { name: 'release con el código fuente de FFmpeg', url: RELEASE_URL },
  ].filter((target) => target.url);

  for (const target of targets) {
    const result = await probe(target.url);

    if (result.error) {
      warn(`No se pudo comprobar «${target.name}» (${target.url}): ${result.error}`);
      continue;
    }

    if (!result.ok) {
      fail(
        `«${target.name}» no es accesible sin autenticación: HTTP ${result.status} en ${target.url}. ` +
          'La AGPL-3.0 §13 exige que el código fuente esté disponible para cualquiera.',
      );
    }
  }

  // Los tarball del release deben poder descargarse.
  if (await probe(RELEASE_URL)) {
    const releaseAssets = [
      `${RELEASE_URL.replace(/\/tag\/.*$/, '')}/download/corresponding-source-v1.0.0/SOURCES.json`,
      `${RELEASE_URL.replace(/\/tag\/.*$/, '')}/download/corresponding-source-v1.0.0/ffmpeg-n5.1.4.tar.gz`,
      `${RELEASE_URL.replace(/\/tag\/.*$/, '')}/download/corresponding-source-v1.0.0/x264-4-cores.tar.gz`,
      `${RELEASE_URL.replace(/\/tag\/.*$/, '')}/download/corresponding-source-v1.0.0/x265-3.4.tar.gz`,
    ];

    for (const url of releaseAssets) {
      const result = await probe(url);
      const name = url.split('/').pop();
      if (result.error) {
        warn(`No se pudo comprobar el asset «${name}»: ${result.error}`);
      } else if (!result.ok) {
        fail(`El asset «${name}» del release no se puede descargar: HTTP ${result.status}.`);
      }
    }
  }

  if (deployedSha) {
    console.log(`  · SHA desplegado: ${deployedSha}`);
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
    `(${skippedPages} redirecciones excluidas), ${canonicalChecked} páginas con origen canónico ` +
    `${CANONICAL_ORIGIN} y ${bundlesScanned} bundles sin peticiones a hosts externos no autorizados.`,
);
if (warnings.length > 0) {
  console.log('Avisos:');
  for (const warning of warnings) console.log(`  · ${warning}`);
}
console.log('');

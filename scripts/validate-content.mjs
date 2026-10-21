/**
 * Valida la coherencia del contenido SEO de imagen antes de publicar.
 * Uso: node scripts/validate-content.mjs
 */
/**
 * scripts/validate-content.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const formats = read('src/data/formats.json');
const conversions = read('src/data/conversions.json');
const cards = read('src/data/conversion-cards.json');
const pdfTools = read('src/data/pdf-tools.json');
const dataTools = read('src/data/data-tools.json');
const mediaTools = read('src/data/media-tools.json');

const errors = [];
const fail = (message) => errors.push(message);
const formatIds = new Set();
const conversionSlugs = new Set();

const validKinds = new Set(['lossless', 'lossy', 'uncompressed', 'container']);
const validProcessor = new Set(['image-convert', 'heic-convert']);

for (const format of formats) {
  if (!format.id || formatIds.has(format.id)) fail(`Formato duplicado o vacío: ${format.id}`);
  formatIds.add(format.id);
  if (!validKinds.has(format.kind)) fail(`${format.id}: kind inválido (${format.kind})`);
  for (const field of ['label', 'extension', 'mime', 'history', 'compression', 'browserSupport']) {
    if (!format[field] || typeof format[field] !== 'string') fail(`${format.id}: falta ${field}`);
  }
  if (!Array.isArray(format.useCases) || format.useCases.length < 3)
    fail(`${format.id}: se esperan 3 usos`);
  if (!Array.isArray(format.avoidWhen) || format.avoidWhen.length < 2)
    fail(`${format.id}: se esperan al menos 2 «evítalo si»`);
  if (!Array.isArray(format.mistakes) || format.mistakes.length < 3)
    fail(`${format.id}: se esperan 3 errores`);
  if (!Array.isArray(format.faq) || format.faq.length < 3) fail(`${format.id}: se esperan 3 FAQ`);
  if (!format.spec || format.spec.mime !== format.mime) fail(`${format.id}: spec.mime incoherente`);
}

if (formats.length !== 7) fail(`Se esperaban 7 formatos, hay ${formats.length}`);

for (const conversion of conversions) {
  const { slug, from, to, processorId } = conversion;
  if (!slug || conversionSlugs.has(slug)) fail(`Conversión duplicada o vacía: ${slug}`);
  conversionSlugs.add(slug);
  if (!formatIds.has(from)) fail(`${slug}: origen desconocido ${from}`);
  if (!formatIds.has(to)) fail(`${slug}: destino desconocido ${to}`);
  if (slug !== `${from}-a-${to}`) fail(`${slug}: el slug no coincide con ${from}-a-${to}`);
  if (!validProcessor.has(processorId)) fail(`${slug}: processorId inválido ${processorId}`);
  if (from === 'heic' && processorId !== 'heic-convert')
    fail(`${slug}: HEIC debe usar heic-convert`);
  if (from !== 'heic' && processorId !== 'image-convert')
    fail(`${slug}: solo HEIC puede usar heic-convert`);

  for (const field of ['title', 'h1', 'description', 'intro']) {
    if (!conversion[field] || typeof conversion[field] !== 'string')
      fail(`${slug}: falta ${field}`);
  }
  if (conversion.description.length > 180)
    fail(`${slug}: description demasiado larga (${conversion.description.length})`);
  if (!Array.isArray(conversion.why) || conversion.why.length < 2)
    fail(`${slug}: se esperan 2 párrafos en why`);
  if (!Array.isArray(conversion.useCases) || conversion.useCases.length < 3)
    fail(`${slug}: se esperan 3 usos`);
  if (!Array.isArray(conversion.mistakes) || conversion.mistakes.length < 3)
    fail(`${slug}: se esperan 3 errores`);
  if (!Array.isArray(conversion.faq) || conversion.faq.length < 4)
    fail(`${slug}: se esperan 4 FAQ`);
  if (!Array.isArray(conversion.keywords) || conversion.keywords.length < 5)
    fail(`${slug}: se esperan 5 keywords`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(conversion.updated ?? ''))
    fail(`${slug}: updated no es una fecha ISO`);
  if (!Array.isArray(conversion.related) || conversion.related.length < 3)
    fail(`${slug}: se esperan 3 conversiones relacionadas`);
  for (const related of conversion.related ?? []) {
    if (related === slug) fail(`${slug}: se enlaza a sí misma`);
    if (!conversions.some((item) => item.slug === related))
      fail(`${slug}: relación inexistente ${related}`);
  }
}

if (conversions.length !== 20) fail(`Se esperaban 20 conversiones, hay ${conversions.length}`);

const expectedPdfSlugs = new Set([
  'unir-pdf',
  'dividir-pdf',
  'rotar-pdf',
  'reordenar-pdf',
  'imagen-a-pdf',
  'pdf-a-jpg',
  'pdf-a-png',
  'marca-de-agua-pdf',
  'numerar-paginas-pdf',
  'comprimir-pdf',
]);
const pdfSlugs = new Set();
const pdfDescriptions = new Set();
const pdfIntros = new Set();

if (pdfTools.length !== expectedPdfSlugs.size) {
  fail(`Se esperaban ${expectedPdfSlugs.size} herramientas PDF, hay ${pdfTools.length}`);
}

for (const tool of pdfTools) {
  const { slug } = tool;
  if (!slug || pdfSlugs.has(slug)) fail(`Herramienta PDF duplicada o vacía: ${slug}`);
  pdfSlugs.add(slug);
  if (!expectedPdfSlugs.has(slug)) fail(`Herramienta PDF no esperada: ${slug}`);

  for (const field of ['title', 'h1', 'description', 'intro']) {
    if (!tool[field] || typeof tool[field] !== 'string') fail(`${slug}: falta ${field}`);
  }
  if (tool.title.length > 70) fail(`${slug}: title demasiado largo (${tool.title.length})`);
  if (tool.description.length > 180)
    fail(`${slug}: description demasiado larga (${tool.description.length})`);

  if (pdfDescriptions.has(tool.description)) fail(`${slug}: description duplicada`);
  if (pdfIntros.has(tool.intro)) fail(`${slug}: intro duplicada`);
  pdfDescriptions.add(tool.description);
  pdfIntros.add(tool.intro);

  if (!Array.isArray(tool.why) || tool.why.length < 3) fail(`${slug}: se esperan 3 párrafos en why`);
  if (!Array.isArray(tool.useCases) || tool.useCases.length < 3) fail(`${slug}: se esperan 3 usos`);
  if (!Array.isArray(tool.mistakes) || tool.mistakes.length < 3) fail(`${slug}: se esperan 3 errores`);
  if (!Array.isArray(tool.faq) || tool.faq.length < 4) fail(`${slug}: se esperan 4 FAQ`);
  if (!Array.isArray(tool.keywords) || tool.keywords.length < 5)
    fail(`${slug}: se esperan 5 keywords`);
  if (!Array.isArray(tool.related) || tool.related.length < 3)
    fail(`${slug}: se esperan 3 herramientas relacionadas`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.updated ?? ''))
    fail(`${slug}: updated no es una fecha ISO`);

  for (const faq of tool.faq ?? []) {
    if (!faq.q || !faq.a) fail(`${slug}: FAQ incompleta`);
  }
  for (const related of tool.related ?? []) {
    const relatedSlug = related.replace(/^\/pdf\//, '');
    if (related === `/pdf/${slug}`) fail(`${slug}: se enlaza a sí misma`);
    if (!expectedPdfSlugs.has(relatedSlug)) fail(`${slug}: relación inexistente ${related}`);
  }
}

for (const slug of expectedPdfSlugs) {
  if (!pdfSlugs.has(slug)) fail(`Falta la herramienta PDF: ${slug}`);
}

const expectedDataSlugs = new Set([
  'csv-a-json',
  'json-a-csv',
  'json-a-xlsx',
  'xlsx-a-json',
  'csv-a-xlsx',
  'xlsx-a-csv',
  'json-a-yaml',
  'yaml-a-json',
  'json-a-xml',
  'xml-a-json',
  'markdown-a-html',
  'html-a-markdown',
  'limpiar-texto',
]);
const dataSlugs = new Set();
const dataDescriptions = new Set();
const dataIntros = new Set();

if (dataTools.length !== expectedDataSlugs.size) {
  fail(`Se esperaban ${expectedDataSlugs.size} herramientas de datos/texto, hay ${dataTools.length}`);
}

for (const tool of dataTools) {
  const { slug } = tool;
  if (!slug || dataSlugs.has(slug)) fail(`Herramienta de datos/texto duplicada o vacía: ${slug}`);
  dataSlugs.add(slug);
  if (!expectedDataSlugs.has(slug)) fail(`Herramienta de datos/texto no esperada: ${slug}`);

  for (const field of ['title', 'h1', 'description', 'intro']) {
    if (!tool[field] || typeof tool[field] !== 'string') fail(`${slug}: falta ${field}`);
  }
  if (tool.title.length > 70) fail(`${slug}: title demasiado largo (${tool.title.length})`);
  if (tool.description.length > 180)
    fail(`${slug}: description demasiado larga (${tool.description.length})`);

  if (dataDescriptions.has(tool.description)) fail(`${slug}: description duplicada`);
  if (dataIntros.has(tool.intro)) fail(`${slug}: intro duplicada`);
  dataDescriptions.add(tool.description);
  dataIntros.add(tool.intro);

  if (!Array.isArray(tool.why) || tool.why.length < 3) fail(`${slug}: se esperan 3 párrafos en why`);
  if (!Array.isArray(tool.useCases) || tool.useCases.length < 3) fail(`${slug}: se esperan 3 usos`);
  if (!Array.isArray(tool.mistakes) || tool.mistakes.length < 3) fail(`${slug}: se esperan 3 errores`);
  if (!Array.isArray(tool.faq) || tool.faq.length < 4) fail(`${slug}: se esperan 4 FAQ`);
  if (!Array.isArray(tool.keywords) || tool.keywords.length < 5)
    fail(`${slug}: se esperan 5 keywords`);
  if (!Array.isArray(tool.related) || tool.related.length < 3)
    fail(`${slug}: se esperan 3 herramientas relacionadas`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.updated ?? ''))
    fail(`${slug}: updated no es una fecha ISO`);

  for (const faq of tool.faq ?? []) {
    if (!faq.q || !faq.a) fail(`${slug}: FAQ incompleta`);
  }
  for (const related of tool.related ?? []) {
    const relatedSlug = related.replace(/^\/(convertir|texto)\//, '');
    if (related === `/convertir/${slug}` || related === `/texto/${slug}`) fail(`${slug}: se enlaza a sí misma`);
    if (!expectedDataSlugs.has(relatedSlug)) fail(`${slug}: relación inexistente ${related}`);
  }
}

for (const slug of expectedDataSlugs) {
  if (!dataSlugs.has(slug)) fail(`Falta la herramienta de datos/texto: ${slug}`);
}

const expectedMediaSlugs = new Set([
  'mp3-a-wav',
  'wav-a-mp3',
  'ogg-a-mp3',
  'm4a-a-mp3',
  'flac-a-wav',
  'mp4-a-mp3',
  'mp4-a-wav',
  'webm-a-mp3',
  'mp4-a-gif',
  'comprimir-video',
  'cortar-audio',
  'cortar-video',
]);
const mediaSlugs = new Set();
const mediaDescriptions = new Set();
const mediaIntros = new Set();

if (mediaTools.length !== expectedMediaSlugs.size) {
  fail(`Se esperaban ${expectedMediaSlugs.size} herramientas multimedia, hay ${mediaTools.length}`);
}

for (const tool of mediaTools) {
  const { slug } = tool;
  if (!slug || mediaSlugs.has(slug)) fail(`Herramienta multimedia duplicada o vacía: ${slug}`);
  mediaSlugs.add(slug);
  if (!expectedMediaSlugs.has(slug)) fail(`Herramienta multimedia no esperada: ${slug}`);

  for (const field of ['title', 'h1', 'description', 'intro']) {
    if (!tool[field] || typeof tool[field] !== 'string') fail(`${slug}: falta ${field}`);
  }
  if (tool.title.length > 70) fail(`${slug}: title demasiado largo (${tool.title.length})`);
  if (tool.description.length > 180) fail(`${slug}: description demasiado larga (${tool.description.length})`);

  if (mediaDescriptions.has(tool.description)) fail(`${slug}: description duplicada`);
  if (mediaIntros.has(tool.intro)) fail(`${slug}: intro duplicada`);
  mediaDescriptions.add(tool.description);
  mediaIntros.add(tool.intro);

  if (!Array.isArray(tool.why) || tool.why.length < 3) fail(`${slug}: se esperan 3 párrafos en why`);
  if (!Array.isArray(tool.useCases) || tool.useCases.length < 3) fail(`${slug}: se esperan 3 usos`);
  if (!Array.isArray(tool.mistakes) || tool.mistakes.length < 3) fail(`${slug}: se esperan 3 errores`);
  if (!Array.isArray(tool.faq) || tool.faq.length < 4) fail(`${slug}: se esperan 4 FAQ`);
  if (!Array.isArray(tool.keywords) || tool.keywords.length < 5) fail(`${slug}: se esperan 5 keywords`);
  if (!Array.isArray(tool.related) || tool.related.length < 3) fail(`${slug}: se esperan 3 herramientas relacionadas`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.updated ?? '')) fail(`${slug}: updated no es una fecha ISO`);

  for (const faq of tool.faq ?? []) {
    if (!faq.q || !faq.a) fail(`${slug}: FAQ incompleta`);
  }
  for (const related of tool.related ?? []) {
    const relatedSlug = related.replace(/^\/(convertir|media)\//, '');
    if (related === `/convertir/${slug}` || related === `/media/${slug}`) fail(`${slug}: se enlaza a sí misma`);
    if (!expectedMediaSlugs.has(relatedSlug)) fail(`${slug}: relación inexistente ${related}`);
  }
}

for (const slug of expectedMediaSlugs) {
  if (!mediaSlugs.has(slug)) fail(`Falta la herramienta multimedia: ${slug}`);
}

const cardsById = new Map(cards.map((card) => [card.id, card]));
if (cards.length !== conversions.length) fail('conversion-cards.json no coincide en cantidad');
for (const conversion of conversions) {
  const card = cardsById.get(conversion.slug);
  if (!card) {
    fail(`Falta la tarjeta de ${conversion.slug}`);
    continue;
  }
  if (card.href !== `/convertir/${conversion.slug}`) fail(`${conversion.slug}: href incorrecto`);
}

const pairs = new Set(conversions.map((conversion) => `${conversion.from}>${conversion.to}`));
if (pairs.size !== conversions.length) fail('Hay pares de conversión duplicados');

if (errors.length > 0) {
  console.error(`\n✗ Contenido de imagen inválido (${errors.length}):\n`);
  for (const error of errors) console.error(`  · ${error}`);
  console.error('');
  process.exit(1);
}

console.log(
  `\n✓ Contenido válido: ${formats.length} formatos, ${conversions.length} conversiones, ${cards.length} tarjetas, ${pdfTools.length} herramientas PDF, ${dataTools.length} herramientas de datos/texto y ${mediaTools.length} herramientas multimedia.\n`,
);


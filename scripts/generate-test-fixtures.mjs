/**
 * scripts/generate-test-fixtures.mjs
 * Copyright (C) 2026 ConvertiLocal contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdirSync } from 'node:fs';
import { PDFDocument, PDFHexString } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

mkdirSync('tests/fixtures', { recursive: true });

const doc = await PDFDocument.create();
doc.addPage([200, 200]);
doc.addPage([300, 200]);
// Metadatos e ID fijos: el fixture debe ser idéntico byte a byte en cada
// ejecución, o el repositorio se ensucia al regenerar las pruebas.
doc.setCreationDate(new Date('2024-01-01T00:00:00Z'));
doc.setModificationDate(new Date('2024-01-01T00:00:00Z'));
doc.setProducer('convertilocal-fixtures');
doc.setCreator('convertilocal-fixtures');
doc.context.trailerInfo.ID = PDFHexString.of('00C7B2E1A4F6D3C8E5A9B0C1D2E3F4A5B');
writeFileSync('tests/fixtures/sample.pdf', await doc.save());

function run(args) {
  const result = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg falló: ${args.join(' ')}`);
}

run(['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', '-b:a', '128k', 'tests/fixtures/sample.mp3']);
run(['-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', 'tests/fixtures/sample.mp4']);
run(['-y', '-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', '-update', '1', 'tests/fixtures/sample.png']);
// JPG de 80x60 para las pruebas de conversión a PDF (tamaño distinto al PNG).
run(['-y', '-f', 'lavfi', '-i', 'color=c=0x1d4ed8:s=80x60', '-frames:v', '1', '-update', '1', 'tests/fixtures/sample.jpg']);
// Segundo JPG, de otro color y tamaño, para probar el reordenamiento.
run(['-y', '-f', 'lavfi', '-i', 'color=c=0xdc2626:s=120x90', '-frames:v', '1', '-update', '1', 'tests/fixtures/sample2.jpg']);
console.log('Fixtures de prueba generados.');

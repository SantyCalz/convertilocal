import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdirSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

mkdirSync('tests/fixtures', { recursive: true });

const doc = await PDFDocument.create();
doc.addPage([200, 200]);
doc.addPage([300, 200]);
writeFileSync('tests/fixtures/sample.pdf', await doc.save());

function run(args) {
  const result = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg falló: ${args.join(' ')}`);
}

run(['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', '-b:a', '128k', 'tests/fixtures/sample.mp3']);
run(['-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', 'tests/fixtures/sample.mp4']);
run(['-y', '-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', '-update', '1', 'tests/fixtures/sample.png']);
console.log('Fixtures de prueba generados.');

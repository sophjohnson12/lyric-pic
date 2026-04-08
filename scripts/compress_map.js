#!/usr/bin/env node
// Compress map PNGs to WebP
// Usage: node scripts/compress_map.js
// Output: ./compressed_map/*.webp

import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { statSync } from 'fs';
import { join, basename, extname } from 'path';

const QUALITY = 82;
const MAX_WIDTH = 1920;
const INPUT_DIR = './original_map';
const OUTPUT_DIR = './compressed_map';

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const files = (await readdir(INPUT_DIR)).filter(f => extname(f).toLowerCase() === '.png');
  if (files.length === 0) {
    console.log(`No .png files found in ${INPUT_DIR}`);
    process.exit(0);
  }

  console.log(`\nCompressing ${files.length} files (quality=${QUALITY}, maxWidth=${MAX_WIDTH})...\n`);
  console.log('File'.padEnd(40) + 'Original'.padStart(12) + 'Compressed'.padStart(12) + 'Reduction'.padStart(12));
  console.log('-'.repeat(76));

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of files.sort()) {
    const inputPath = join(INPUT_DIR, file);
    const outputName = basename(file, extname(file)) + '.webp';
    const outputPath = join(OUTPUT_DIR, outputName);

    await sharp(inputPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const origSize = statSync(inputPath).size;
    const compSize = statSync(outputPath).size;
    const reduction = ((1 - compSize / origSize) * 100).toFixed(1);

    totalOriginal += origSize;
    totalCompressed += compSize;

    const origKB = (origSize / 1024).toFixed(1) + ' KB';
    const compKB = (compSize / 1024).toFixed(1) + ' KB';
    console.log(
      file.padEnd(40) +
      origKB.padStart(12) +
      compKB.padStart(12) +
      `${reduction}%`.padStart(12)
    );
  }

  const overallReduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  console.log('-'.repeat(76));
  console.log(
    'TOTAL'.padEnd(40) +
    `${(totalOriginal / 1024 / 1024).toFixed(2)} MB`.padStart(12) +
    `${(totalCompressed / 1024 / 1024).toFixed(2)} MB`.padStart(12) +
    `${overallReduction}%`.padStart(12)
  );
  console.log(`\nOutput written to ${OUTPUT_DIR}/\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

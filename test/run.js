#!/usr/bin/env node
// Standalone Zero-Dependency Test Suite Runner for YTSpoofingStream
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { globSync } from 'node:fs';
import path from 'node:path';

const testFiles = globSync('test/**/*.test.js', { cwd: process.cwd() });
console.log(`\x1b[36m[YTSS Test Runner]\x1b[0m Discovered ${testFiles.length} test files...`);

const stream = run({
  files: testFiles.map(f => path.resolve(process.cwd(), f)),
  concurrency: true,
});

stream.compose(spec).pipe(process.stdout);

/// <reference types="node" />
// Checks a versions file (several versions of a poem, with sources and guidance):
//   node tools/check-versions.ts FILE.json
// Exits with status 1 if the file has errors.
import { readFileSync } from 'node:fs';
import { checkVersions, summarizeVersions } from './versions-check.ts';
import type { VersionsFile } from '../src/versions.ts';

const [path] = process.argv.slice(2);
if (!path) {
  console.error('Usage: node tools/check-versions.ts FILE.json');
  process.exit(2);
}

let data: unknown;
try {
  data = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
} catch (e) {
  console.error(`Can't read ${path} as JSON: ${(e as Error).message}`);
  process.exit(1);
}

const issues = checkVersions(data);
const errors = issues.filter((i) => i.level === 'error').length;
if (!errors) {
  console.log(`${path}:`);
  for (const line of summarizeVersions(data as VersionsFile)) console.log(`  ${line}`);
}
if (issues.length) {
  console.log(`\nProblems in ${path}:`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? 'ERROR' : 'warning'}: ${i.message}`);
}
console.log(
  errors
    ? `\n${errors} error(s): fix them before using this file.`
    : issues.length
      ? '\nNo errors, but read the warnings above.'
      : '\nNo problems found.',
);
process.exit(errors ? 1 : 0);

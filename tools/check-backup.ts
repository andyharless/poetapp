/// <reference types="node" />
// Checks an edited backup before you import it into Rhapsode:
//   node tools/check-backup.ts EDITED.json [ORIGINAL.json]
// With the original export as well, it also lists what importing the edited file will change.
// Exits with status 1 if the edited file has errors.
import { readFileSync } from 'node:fs';
import { checkBackup, compareBackups, type Issue } from './backup-check.ts';
import type { Backup } from '../src/model';

const [editedPath, originalPath] = process.argv.slice(2);
if (!editedPath) {
  console.error('Usage: node tools/check-backup.ts EDITED.json [ORIGINAL.json]');
  process.exit(2);
}

function load(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    console.error(`Can't read ${path} as JSON: ${(e as Error).message}`);
    process.exit(1);
  }
}

function report(title: string, issues: Issue[]) {
  if (!issues.length) return;
  console.log(`\n${title}`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? 'ERROR' : 'warning'}: ${i.message}`);
}

const edited = load(editedPath);
const problems = checkBackup(edited);
report(`Problems in ${editedPath}:`, problems);
const errors = problems.filter((i) => i.level === 'error').length;
let warnings = problems.length - errors;

if (originalPath && !errors) {
  const original = load(originalPath);
  if (checkBackup(original).some((i) => i.level === 'error')) {
    console.log(`\n${originalPath} isn't a valid backup, so there's nothing to compare against.`);
  } else {
    const { changes, issues } = compareBackups(original as Backup, edited as Backup);
    console.log(`\nImporting ${editedPath} will:`);
    for (const c of changes) console.log(`  - ${c}`);
    if (!changes.length) console.log('  (change nothing)');
    report('Edits that import will not carry out as intended:', issues);
    warnings += issues.length;
  }
}

console.log(
  errors
    ? `\n${errors} error(s): don't import this file until they're fixed.`
    : warnings
      ? '\nNo errors, so it can be imported, but read the warnings above first.'
      : '\nNo problems found; OK to import.',
);
process.exit(errors ? 1 : 0);

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Backup, LineStats, Poem } from './model';

interface PoetDB extends DBSchema {
  poems: { key: string; value: Poem };
  lineStats: { key: [string, number]; value: LineStats; indexes: { byPoem: string } };
  attempts: { key: number; value: Attempt; indexes: { byPoem: string } };
}

let dbPromise: Promise<IDBPDatabase<PoetDB>> | undefined;

function db() {
  dbPromise ??= openDB<PoetDB>('poetapp', 1, {
    upgrade(d) {
      d.createObjectStore('poems', { keyPath: 'id' });
      d.createObjectStore('lineStats', { keyPath: ['poemId', 'lineIndex'] }).createIndex(
        'byPoem',
        'poemId',
      );
      d.createObjectStore('attempts', { autoIncrement: true }).createIndex('byPoem', 'poemId');
    },
  });
  return dbPromise;
}

export async function requestPersistence() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // best effort only
  }
}

export async function listPoems(): Promise<Poem[]> {
  return (await db()).getAll('poems');
}

export async function getPoem(id: string): Promise<Poem | undefined> {
  return (await db()).get('poems', id);
}

export async function savePoem(poem: Poem) {
  await (await db()).put('poems', poem);
}

export async function getLineStats(poemId: string): Promise<LineStats[]> {
  return (await db()).getAllFromIndex('lineStats', 'byPoem', poemId);
}

export async function getAttempts(poemId: string): Promise<Attempt[]> {
  return (await db()).getAllFromIndex('attempts', 'byPoem', poemId);
}

export async function saveResult(poem: Poem, lineStats: LineStats[], attempt: Attempt) {
  const d = await db();
  const tx = d.transaction(['poems', 'lineStats', 'attempts'], 'readwrite');
  await Promise.all([
    tx.objectStore('poems').put(poem),
    ...lineStats.map((s) => tx.objectStore('lineStats').put(s)),
    tx.objectStore('attempts').add(attempt),
    tx.done,
  ]);
}

export async function deletePoem(id: string) {
  const d = await db();
  const tx = d.transaction(['poems', 'lineStats', 'attempts'], 'readwrite');
  const stats = tx.objectStore('lineStats');
  const attempts = tx.objectStore('attempts');
  for await (const c of stats.index('byPoem').iterate(id)) c.delete();
  for await (const c of attempts.index('byPoem').iterate(id)) c.delete();
  await tx.objectStore('poems').delete(id);
  await tx.done;
}

export async function exportAll(): Promise<Backup> {
  const d = await db();
  return {
    version: 1,
    poems: await d.getAll('poems'),
    lineStats: await d.getAll('lineStats'),
    attempts: await d.getAll('attempts'),
  };
}

// Merges into existing data; poems with the same id are overwritten.
export async function importAll(b: Backup) {
  if (b?.version !== 1 || !Array.isArray(b.poems)) throw new Error('Not a poetapp backup file');
  const d = await db();
  const tx = d.transaction(['poems', 'lineStats', 'attempts'], 'readwrite');
  const ids = new Set(b.poems.map((p) => p.id));
  for (const p of b.poems) tx.objectStore('poems').put(p);
  for (const s of b.lineStats) if (ids.has(s.poemId)) tx.objectStore('lineStats').put(s);
  const attempts = tx.objectStore('attempts');
  for (const a of b.attempts) {
    if (!ids.has(a.poemId)) continue;
    // avoid duplicating attempts already present
    const existing = await attempts.index('byPoem').getAll(a.poemId);
    if (!existing.some((e) => e.date === a.date && e.firstPassMisses.join() === a.firstPassMisses.join())) {
      attempts.add(a);
    }
  }
  await tx.done;
}

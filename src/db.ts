import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Backup, Folder, LineStats, Poem } from './model';
import { remapAttempt, remapLineStats } from './remap';
import { lastPassDate, passStreak } from './session';

interface PoetDB extends DBSchema {
  folders: { key: string; value: Folder };
  poems: { key: string; value: Poem };
  lineStats: { key: [string, number]; value: LineStats; indexes: { byPoem: string } };
  attempts: { key: number; value: Attempt; indexes: { byPoem: string } };
}

let dbPromise: Promise<IDBPDatabase<PoetDB>> | undefined;

function db() {
  // The database keeps its original 'poetapp' name so existing data survives the rename.
  dbPromise ??= openDB<PoetDB>('poetapp', 4, {
    async upgrade(d, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        d.createObjectStore('poems', { keyPath: 'id' });
        d.createObjectStore('lineStats', { keyPath: ['poemId', 'lineIndex'] }).createIndex(
          'byPoem',
          'poemId',
        );
        d.createObjectStore('attempts', { autoIncrement: true }).createIndex('byPoem', 'poemId');
      }
      if (oldVersion >= 1 && oldVersion < 3) {
        // v2 records the last passed date on each poem and v3 the pass streak; derive them
        // from past attempts.
        const attempts = await tx.objectStore('attempts').getAll();
        for (const p of await tx.objectStore('poems').getAll()) {
          const mine = attempts.filter((a) => a.poemId === p.id);
          if (oldVersion < 2) p.lastPassed = lastPassDate(mine);
          p.passStreak = passStreak(mine);
          await tx.objectStore('poems').put(p);
        }
      }
      if (oldVersion < 4) d.createObjectStore('folders', { keyPath: 'id' });
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

// Saves an edited poem. `map` sends each old line index to its new one (or
// undefined if removed), so per-line history follows the lines it belongs to.
export async function updatePoem(poem: Poem, map: (number | undefined)[]) {
  const d = await db();
  const tx = d.transaction(['poems', 'lineStats', 'attempts'], 'readwrite');
  const stats = tx.objectStore('lineStats');
  const old = await stats.index('byPoem').getAll(poem.id);
  for await (const c of stats.index('byPoem').iterate(poem.id)) await c.delete();
  for (const st of remapLineStats(old, map)) await stats.put(st);
  for await (const c of tx.objectStore('attempts').index('byPoem').iterate(poem.id)) {
    await c.update(remapAttempt(c.value, map));
  }
  await tx.objectStore('poems').put(poem);
  await tx.done;
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

export async function listFolders(): Promise<Folder[]> {
  return (await db()).getAll('folders');
}

export async function saveFolder(folder: Folder) {
  await (await db()).put('folders', folder);
}

// Deletes a folder. Its poems become unfiled; no poems are deleted.
export async function deleteFolder(id: string) {
  const d = await db();
  const tx = d.transaction(['folders', 'poems'], 'readwrite');
  for await (const c of tx.objectStore('poems').iterate()) {
    if (c.value.folderId === id) await c.update({ ...c.value, folderId: undefined });
  }
  await tx.objectStore('folders').delete(id);
  await tx.done;
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
    folders: await d.getAll('folders'),
    poems: await d.getAll('poems'),
    lineStats: await d.getAll('lineStats'),
    attempts: await d.getAll('attempts'),
  };
}

// Merges into existing data; poems with the same id are overwritten.
export async function importAll(b: Backup) {
  if (b?.version !== 1 || !Array.isArray(b.poems)) throw new Error('Not a Rhapsode backup file');
  const d = await db();
  const tx = d.transaction(['folders', 'poems', 'lineStats', 'attempts'], 'readwrite');
  for (const f of b.folders ?? []) tx.objectStore('folders').put(f);
  const ids = new Set(b.poems.map((p) => p.id));
  for (const p of b.poems) {
    // backups made before lastPassed or passStreak existed
    const mine = b.attempts.filter((a) => a.poemId === p.id);
    tx.objectStore('poems').put({
      ...p,
      lastPassed: p.lastPassed ?? lastPassDate(mine),
      passStreak: p.passStreak ?? passStreak(mine),
    });
  }
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

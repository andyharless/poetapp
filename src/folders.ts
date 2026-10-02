import type { Folder, Poem } from './model';

// Which poems the list shows: 'all', 'unfiled', or a folder id.
export type FolderChoice = string;

export function inFolder(p: Poem, choice: FolderChoice, folderIds: Set<string>): boolean {
  if (choice === 'all') return true;
  const filed = !!p.folderId && folderIds.has(p.folderId);
  return choice === 'unfiled' ? !filed : p.folderId === choice;
}

// The remembered choice, if it still makes sense; otherwise 'all'.
export function validChoice(saved: string | null, folderIds: Set<string>): FolderChoice {
  if (!saved || folderIds.size === 0) return 'all';
  return saved === 'unfiled' || folderIds.has(saved) ? saved : 'all';
}

export function byName(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name));
}

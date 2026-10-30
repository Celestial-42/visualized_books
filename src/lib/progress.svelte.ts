const KEY = 'visualized-books-progress';
const LEGACY_KEY = 'memory-primer-progress';

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as string[];
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    // v1 stored bare chapter slugs; everything there belonged to the first book
    return (JSON.parse(legacy) as string[]).map((k) => (k.includes('/') ? k : `memory-primer/${k}`));
  } catch {
    return [];
  }
};

export const progress = $state({ visited: load() });

const keyOf = (bookId: string, slug: string) => `${bookId}/${slug}`;

export const isVisited = (bookId: string, slug: string) => progress.visited.includes(keyOf(bookId, slug));

export function markVisited(bookId: string, slug: string) {
  const key = keyOf(bookId, slug);
  if (progress.visited.includes(key)) return;
  progress.visited = [...progress.visited, key];
  try {
    localStorage.setItem(KEY, JSON.stringify(progress.visited));
  } catch {
    /* storage may be unavailable */
  }
}

export const visitedIn = (bookId: string, slugs: string[]) =>
  slugs.filter((slug) => progress.visited.includes(keyOf(bookId, slug))).length;

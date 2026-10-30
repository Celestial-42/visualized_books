const KEY = 'memory-primer-progress';

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const progress = $state({ visited: load() });

export function markVisited(slug: string) {
  if (progress.visited.includes(slug)) return;
  progress.visited = [...progress.visited, slug];
  try {
    localStorage.setItem(KEY, JSON.stringify(progress.visited));
  } catch {
    /* storage may be unavailable */
  }
}

const read = () => {
  const raw = window.location.hash.replace(/^#/, '');
  return raw === '' ? '/' : raw;
};

export const router = $state({ path: read() });

const sync = () => {
  router.path = read();
};

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', sync);
}

export function navigate(path: string) {
  if (path.startsWith('#')) path = path.slice(1);
  if (router.path === path) return;
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function href(path: string) {
  return `#${path}`;
}

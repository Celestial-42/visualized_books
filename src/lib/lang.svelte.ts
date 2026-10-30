export type Lang = 'zh' | 'en';

const KEY = 'memory-primer-lang';

const read = (): Lang => {
  if (typeof window === 'undefined') return 'zh';
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
};

const initial = read();

export const lang = $state({ value: initial });

if (typeof document !== 'undefined') {
  document.documentElement.lang = initial === 'en' ? 'en' : 'zh-CN';
}

export function setLang(value: Lang) {
  if (lang.value === value) return;
  lang.value = value;
  document.documentElement.lang = value === 'en' ? 'en' : 'zh-CN';
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage may be unavailable */
  }
}

/** Pick the string for the current language. Reads the rune, so it re-renders. */
export const t = (zh: string, en: string) => (lang.value === 'en' ? en : zh);

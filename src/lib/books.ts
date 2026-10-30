import { CHAPTERS as MP_CHAPTERS, PARTS as MP_PARTS, type Chapter } from './content';
import { OCN_CHAPTERS, OCN_PARTS } from './noc/content';
import { ICN_CHAPTERS, ICN_PARTS } from './icn/content';

export type BookId = 'memory-primer' | 'on-chip-networks' | 'interconnection-networks';

export type Part = { id: string; label: string; en: string };

export type Book = {
  id: BookId;
  no: string;
  title: string;
  titleEn: string;
  spine: string;
  short: string;
  shortEn: string;
  authors: string;
  edition: string;
  pages: string;
  parts: Part[];
  chapters: Chapter[];
};

export const BOOKS: Book[] = [
  {
    id: 'memory-primer',
    no: '01',
    title: '共享内存图谱',
    titleEn: 'Shared Memory Atlas',
    spine: 'Consistency × Coherence',
    short: '内存连贯性',
    shortEn: 'Consistency & Coherence',
    authors: 'Sorin · Nagarajan · Hill · Wood',
    edition: '2nd edition · 2020',
    pages: '296',
    parts: MP_PARTS,
    chapters: MP_CHAPTERS
  },
  {
    id: 'on-chip-networks',
    no: '02',
    title: '片上网络',
    titleEn: 'On-Chip Networks',
    spine: 'Topology × Flow',
    short: '片上网络',
    shortEn: 'On-Chip Networks',
    authors: 'Enright Jerger · Krishna · Peh',
    edition: '2nd edition · 2017',
    pages: '142',
    parts: OCN_PARTS,
    chapters: OCN_CHAPTERS
  },
  {
    id: 'interconnection-networks',
    no: '03',
    title: '并行互连网络',
    titleEn: 'Interconnection Networks',
    spine: 'Deadlock × Routing',
    short: '一种工程方法',
    shortEn: 'An Engineering Approach',
    authors: 'Duato · Yalamanchili · Ni',
    edition: '中文版 · 2004',
    pages: '400',
    parts: ICN_PARTS,
    chapters: ICN_CHAPTERS
  }
];

export const bookById = (id: string) => BOOKS.find((b) => b.id === id) ?? null;

export const readyChapters = (book: Book) => book.chapters.filter((c) => c.status === 'ready');

export const bookHref = (id: BookId) => `#/book/${id}`;

export const chapterHref = (bookId: BookId, slug: string) => `#/book/${bookId}/${slug}`;

export type Route =
  | { kind: 'library' }
  | { kind: 'book'; book: Book }
  | { kind: 'chapter'; book: Book; chapter: Chapter }
  | { kind: 'missing' };

/** Everything the site knows how to render, derived from one hash path. */
export const parseRoute = (path: string): Route => {
  const seg = path.replace(/^#/, '').split('/').filter(Boolean);
  if (seg.length === 0) return { kind: 'library' };

  // legacy links from the single-book era: #/ch3 → #/book/memory-primer/ch3
  if (/^ch\d+$/.test(seg[0])) {
    const book = bookById('memory-primer');
    const chapter = book?.chapters.find((c) => c.slug === seg[0]);
    return book && chapter ? { kind: 'chapter', book, chapter } : { kind: 'missing' };
  }

  if (seg[0] !== 'book' || !seg[1]) return { kind: 'missing' };
  const book = bookById(seg[1]);
  if (!book) return { kind: 'missing' };
  if (!seg[2]) return { kind: 'book', book };
  const chapter = book.chapters.find((c) => c.slug === seg[2]);
  return chapter ? { kind: 'chapter', book, chapter } : { kind: 'missing' };
};

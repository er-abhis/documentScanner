import RNFS from 'react-native-fs';
import { buildPdfBase64 } from '../pdf';

export type DocumentMeta = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** page image filenames, relative to the document's dir; order = page order */
  pageFiles: string[];
  /** generated PDF filename, if any (Phase 7) */
  pdfFile?: string;
};

const BASE = `${RNFS.DocumentDirectoryPath}/documents`;
const INDEX = `${BASE}/index.json`;

const strip = (uri: string) => uri.replace(/^file:\/\//, '');
const docDir = (id: string) => `${BASE}/${id}`;

async function ensureBase() {
  if (!(await RNFS.exists(BASE))) await RNFS.mkdir(BASE);
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  try {
    if (!(await RNFS.exists(INDEX))) return [];
    const raw = await RNFS.readFile(INDEX, 'utf8');
    const list = JSON.parse(raw) as DocumentMeta[];
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // corrupt index -> treat as empty rather than crash
  }
}

async function writeIndex(list: DocumentMeta[]) {
  await ensureBase();
  await RNFS.writeFile(INDEX, JSON.stringify(list), 'utf8');
}

/** Absolute file:// uris for a document's pages, in order. */
export function pageUris(meta: DocumentMeta): string[] {
  return meta.pageFiles.map(f => `file://${docDir(meta.id)}/${f}`);
}

/** First page uri for thumbnails (or null). */
export function thumbUri(meta: DocumentMeta): string | null {
  return meta.pageFiles.length ? `file://${docDir(meta.id)}/${meta.pageFiles[0]}` : null;
}

/** Absolute file:// uri of the generated PDF, if any. */
export function pdfUri(meta: DocumentMeta): string | null {
  return meta.pdfFile ? `file://${docDir(meta.id)}/${meta.pdfFile}` : null;
}

/** Generate (or regenerate) the document's PDF and persist it. Returns file:// uri. */
export async function generateDocumentPdf(id: string): Promise<string> {
  const list = await listDocuments();
  const meta = list.find(d => d.id === id);
  if (!meta) throw new Error('not_found');
  const pages = pageUris(meta);
  const base64 = await buildPdfBase64(pages);
  const file = 'document.pdf';
  await RNFS.writeFile(`${docDir(id)}/${file}`, base64, 'base64');
  await writeIndex(
    list.map(d => (d.id === id ? { ...d, pdfFile: file, updatedAt: Date.now() } : d)),
  );
  return `file://${docDir(id)}/${file}`;
}

function defaultName(now: number) {
  const d = new Date(now);
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `Scan ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Persist draft pages (currently in cache) into permanent storage. */
export async function saveDocument(
  pages: { uri: string }[],
  name?: string,
): Promise<DocumentMeta> {
  await ensureBase();
  const now = Date.now();
  const id = `doc_${now}`;
  const dir = docDir(id);
  await RNFS.mkdir(dir);

  const pageFiles: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const file = `page_${i}.jpg`;
    await RNFS.copyFile(strip(pages[i].uri), `${dir}/${file}`);
    pageFiles.push(file);
  }

  const meta: DocumentMeta = {
    id,
    name: name?.trim() || defaultName(now),
    createdAt: now,
    updatedAt: now,
    pageFiles,
  };
  await writeIndex([meta, ...(await listDocuments())]);
  return meta;
}

export async function renameDocument(id: string, name: string) {
  const list = await listDocuments();
  await writeIndex(
    list.map(d =>
      d.id === id ? { ...d, name: name.trim() || d.name, updatedAt: Date.now() } : d,
    ),
  );
}

export async function deleteDocument(id: string) {
  const dir = docDir(id);
  if (await RNFS.exists(dir)) await RNFS.unlink(dir);
  await writeIndex((await listDocuments()).filter(d => d.id !== id));
}

export async function duplicateDocument(id: string): Promise<DocumentMeta | null> {
  const list = await listDocuments();
  const src = list.find(d => d.id === id);
  if (!src) return null;
  const now = Date.now();
  const newId = `doc_${now}`;
  const dstDir = docDir(newId);
  await RNFS.mkdir(dstDir);
  for (const f of src.pageFiles) {
    await RNFS.copyFile(`${docDir(id)}/${f}`, `${dstDir}/${f}`);
  }
  const meta: DocumentMeta = {
    ...src,
    id: newId,
    name: `${src.name} copy`,
    createdAt: now,
    updatedAt: now,
    pdfFile: undefined,
  };
  await writeIndex([meta, ...list]);
  return meta;
}

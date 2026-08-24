import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type DraftPage = { id: string; uri: string };

type DraftContext = {
  pages: DraftPage[];
  addPages: (uris: string[]) => void;
  replacePage: (id: string, uri: string) => void;
  removePage: (id: string) => void;
  setPages: (pages: DraftPage[]) => void;
  clear: () => void;
};

const Ctx = createContext<DraftContext | null>(null);

/** In-memory draft of the document currently being built (persisted in Phase 6). */
export function DraftProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<DraftPage[]>([]);
  const seq = useRef(0);

  const addPages = useCallback((uris: string[]) => {
    setPages(prev => [
      ...prev,
      ...uris.map(uri => ({ id: `p${seq.current++}`, uri })),
    ]);
  }, []);

  const replacePage = useCallback((id: string, uri: string) => {
    setPages(prev => prev.map(p => (p.id === id ? { ...p, uri } : p)));
  }, []);

  const removePage = useCallback((id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  }, []);

  const clear = useCallback(() => setPages([]), []);

  const value = useMemo(
    () => ({ pages, addPages, replacePage, removePage, setPages, clear }),
    [pages, addPages, replacePage, removePage, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}

import { useEffect } from "react";

const BASE = "JillSpoon Leasing";

// Marketing pages set the tab title; the app (which has none of these pages) keeps its own.
export function useTitle(page: string | null) {
  useEffect(() => {
    const prev = document.title;
    document.title = page ? `${page} — ${BASE}` : `${BASE} — Every net mineral acre, logged`;
    return () => {
      document.title = prev;
    };
  }, [page]);
}

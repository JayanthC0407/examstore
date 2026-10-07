import { create } from "zustand";
import { api } from "../lib/api";

// Catalogue taxonomy + headline stats, fetched once and refreshed after admin changes.
export const useMeta = create((set, get) => ({
  meta: null,
  loading: false,

  async load({ force = false } = {}) {
    if ((get().meta && !force) || get().loading) return;
    set({ loading: true });
    try {
      const { data } = await api.get("/meta");
      set({ meta: data });
    } finally {
      set({ loading: false });
    }
  },
}));

export const deptName = (meta, code) => meta?.departments.find((d) => d.code === code)?.name || code;

// Compact label for tight spots like a closed dropdown, e.g. "CSE · Computer Science".
export const deptLabel = (meta, code, empty) => {
  const d = meta?.departments.find((x) => x.code === code);
  return d ? `${d.code} · ${d.short || d.name}` : empty;
};
export const examName = (meta, code) => meta?.examTypes.find((e) => e.code === code)?.name || code;

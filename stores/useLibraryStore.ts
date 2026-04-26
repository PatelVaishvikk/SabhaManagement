import { create } from "zustand";

type ViewMode = "grid" | "list";

interface LibraryState {
  view: ViewMode;
  search: string;
  category: string;
  sourceType: string;
  sort: string;
  selectedIds: string[];
  setView: (view: ViewMode) => void;
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  setSourceType: (sourceType: string) => void;
  setSort: (sort: string) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  view: "grid",
  search: "",
  category: "all",
  sourceType: "all",
  sort: "newest",
  selectedIds: [],
  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  setSourceType: (sourceType) => set({ sourceType }),
  setSort: (sort) => set({ sort }),
  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id]
    })),
  clearSelected: () => set({ selectedIds: [] })
}));

import { create } from 'zustand';

export interface Snap {
  id: string;
  type: 'photo' | 'video';
  uri: string;
  timestamp: number;
  duration: number;
  caption?: string;
  recipients?: string[];
}

interface SnapStore {
  currentSnap: Snap | null;
  snaps: Snap[];
  addSnap: (snap: Snap) => void;
  setCurrentSnap: (snap: Snap | null) => void;
  deleteSnap: (id: string) => void;
}

export const useSnapStore = create<SnapStore>((set) => ({
  currentSnap: null,
  snaps: [],
  
  addSnap: (snap) => set((state) => ({
    snaps: [snap, ...state.snaps],
    currentSnap: snap,
  })),
  
  setCurrentSnap: (snap) => set({ currentSnap: snap }),
  
  deleteSnap: (id) => set((state) => ({
    snaps: state.snaps.filter(s => s.id !== id),
    currentSnap: state.currentSnap?.id === id ? null : state.currentSnap,
  })),
}));
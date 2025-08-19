import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm: (() => void) | null;
  show: (message: string, onConfirm: () => void) => void;
  hide: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  message: '',
  onConfirm: null,
  show: (message, onConfirm) => set({ isOpen: true, message, onConfirm }),
  hide: () => set({ isOpen: false, message: '', onConfirm: null }),
}));
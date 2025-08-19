import { create } from 'zustand';

interface VerificationState {
  emailForVerification: string | null;
  setEmailForVerification: (email: string | null) => void;
}

export const useVerificationStore = create<VerificationState>((set) => ({
  emailForVerification: null,
  setEmailForVerification: (email) => set({ emailForVerification: email }),
}));
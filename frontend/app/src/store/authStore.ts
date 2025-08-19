import { create } from 'zustand'; 
import { persist } from 'zustand/middleware';
import axiosClient from '../api/axiosClient';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: { access: string; refresh: string }, user: User) => void;
  logout: () => void;
  setTokens: (tokens: { access: string; refresh: string }) => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  fetchAndSetUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (tokens, user) => set({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        user: user,
        isAuthenticated: true,
      }),
      logout: () => set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      }),
      setTokens: (tokens) => set({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
      }),
      updateUser: (updatedUserData) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedUserData } : null,
      })),
      fetchAndSetUser: async () => {
        try {
          const response = await axiosClient.get('/users/me');
          set({ user: response.data.user });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
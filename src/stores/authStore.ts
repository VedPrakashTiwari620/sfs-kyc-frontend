import create from 'zustand';
import { getAuthToken, deleteAuthToken } from '../utils/storage';

type AuthState = {
  token: string | null;
  isLoaded: boolean;
  setToken: (token: string) => void;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<void>;
};

export const useAuthStore = create<AuthState>(set => ({
  token: null,
  isLoaded: false,
  setToken: token => set({ token, isLoaded: true }),
  clearToken: async () => {
    await deleteAuthToken();
    set({ token: null, isLoaded: true });
  },
  loadToken: async () => {
    const token = await getAuthToken();
    set({ token, isLoaded: true });
  }
}));

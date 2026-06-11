import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { disconnectSocket } from '../socket/socket.js';

/**
 * Auth state. Persisted to localStorage so a refresh keeps the user logged in (the JWT is
 * the source of truth). We deliberately keep this tiny — token + user — and let the axios
 * interceptor read the token, so auth wiring lives in exactly one place.
 *
 * Zustand chosen over Context here too: the axios interceptor and socket layer need to read
 * auth *imperatively* (outside React) via getState() — trivial with a store, awkward with Context.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: ({ token, user }) => set({ token, user }),

      logout: () => {
        disconnectSocket();
        set({ token: null, user: null });
      },
    }),
    { name: 'pms-auth' }
  )
);

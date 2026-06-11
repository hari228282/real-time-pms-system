import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore.js';

/**
 * Route guard: if there's no token, bounce to /login. The JWT is the source of truth for
 * "am I authenticated", so we just check its presence (the server is the real authority and
 * will 401 an expired token, which the axios interceptor turns into a logout + redirect).
 */
export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

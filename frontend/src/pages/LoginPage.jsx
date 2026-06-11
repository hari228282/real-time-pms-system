import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../api/auth.api.js';
import { Button } from '../components/ui/Button.jsx';
import { ErrorBanner } from '../components/ui/ErrorBanner.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuthStore } from '../store/authStore.js';

/**
 * Login / Register screen. One controlled form toggles between the two modes. On success we
 * store the JWT (which the axios interceptor and socket layer then use) and navigate to the
 * project list. Demonstrates controlled inputs + explicit loading/error states.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result =
        mode === 'login'
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
      setAuth(result);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <h1 className="topbar__title" style={{ marginBottom: '1.25rem' }}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <Input
              id="name"
              name="name"
              label="Name"
              value={form.name}
              onChange={onChange}
              required
            />
          )}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            value={form.email}
            onChange={onChange}
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            value={form.password}
            onChange={onChange}
            required
          />
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
          </Button>
        </form>

        <p className="mt-1 muted">
          {mode === 'login' ? 'No account?' : 'Already registered?'}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

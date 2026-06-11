import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { projectsApi } from '../api/projects.api.js';
import { Button } from '../components/ui/Button.jsx';
import { ErrorBanner } from '../components/ui/ErrorBanner.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';

/**
 * Lists the user's projects and lets them create one. Fetches on mount with loading/error
 * states; a created project is prepended optimistically-free (we just refetch the single new
 * one into the list from the response).
 */
export function ProjectListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await projectsApi.list();
        if (active) setProjects(data.projects);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { project } = await projectsApi.create({ name: name.trim() });
      setProjects((p) => [project, ...p]);
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <h1 className="topbar__title">Projects</h1>
        <div className="row">
          <span className="muted">{user?.name}</span>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="container">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <form onSubmit={onCreate} className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              id="new-project"
              label="New project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Revamp"
            />
          </div>
          <Button type="submit" disabled={creating} style={{ marginBottom: '1rem' }}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </form>

        {loading ? (
          <Spinner label="Loading projects…" />
        ) : projects.length === 0 ? (
          <p className="muted">No projects yet — create your first one above.</p>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <div
                key={p._id}
                className="project-tile"
                onClick={() => navigate(`/projects/${p._id}`)}
              >
                <h3>{p.name}</h3>
                <p>{p.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

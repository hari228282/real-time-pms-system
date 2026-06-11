/** Minimal loading indicator used for page/section loading states. */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" />
      <span>{label}</span>
    </div>
  );
}

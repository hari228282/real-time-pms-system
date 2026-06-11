/** Controlled labelled input — a small reusable wrapper used by every form. */
export function Input({ label, id, error, ...props }) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      )}
      <input id={id} className="field__input" {...props} />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

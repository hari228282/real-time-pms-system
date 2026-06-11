/** Inline, dismissible error display for failed requests. Renders nothing when there's no error. */
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      {onDismiss && (
        <button className="banner__close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

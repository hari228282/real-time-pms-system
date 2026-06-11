/** Reusable button with a couple of variants. Forwards all native props (onClick, type, etc). */
export function Button({ variant = 'primary', className = '', ...props }) {
  return <button className={`btn btn--${variant} ${className}`} {...props} />;
}

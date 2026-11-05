import { useEffect, useRef } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { STATUS_LABEL } from '../lib/format.js';

export function AppShell({ nav, area }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="shell-side" aria-label={`${area} navigation`}>
        <Link to="/" className="shell-mark display">Onda</Link>
        <p className="shell-area">{area}</p>
        <nav className="shell-nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell-user">
          <p className="shell-name">{user?.name}</p>
          <p className="shell-email">{user?.email}</p>
          <button type="button" className="linkish" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title display">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Status({ value }) {
  return <span className={`status status-${value}`}>{STATUS_LABEL[value] || value}</span>;
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h2 className="panel-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note && <p className={`stat-note ${tone || ''}`}>{note}</p>}
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <p className="error-note" role="alert">{error.message || String(error)}</p>;
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('input,select,textarea,button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
        <div className="modal-head">
          <h2 id="modal-title" className="panel-title">{title}</h2>
          <button type="button" className="linkish" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value }) {
  if (!value) return <span className="muted">Not rated</span>;
  return <span className="stars" aria-label={`${value} out of 5`}>{'★'.repeat(value)}<span className="stars-off">{'★'.repeat(5 - value)}</span></span>;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, tokenStore } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api('/auth/me').then(setUser).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onUnauth = () => { tokenStore.set(null); setUser(null); };
    window.addEventListener('onda:unauthorized', onUnauth);
    return () => window.removeEventListener('onda:unauthorized', onUnauth);
  }, []);

  const finish = ({ token, user: u }) => { tokenStore.set(token); setUser(u); return u; };
  const login = useCallback((email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish), []);
  const register = useCallback((data) => api('/auth/register', { method: 'POST', body: data }).then(finish), []);
  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
export const isStaff = (u) => u && (u.role === 'staff' || u.role === 'admin');
/** A stylist (role 'staff') works with their own chair only; the manager (role 'admin') sees the whole studio. */
export const isStylist = (u) => u?.role === 'staff';
export const isManager = (u) => u?.role === 'admin';
export const homeFor =(u) => (isStaff(u) ? '/staff' : '/account');

export function RequireAuth({ role, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="app-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (role === 'staff' && !isStaff(user)) return <Navigate to="/account" replace />;
  if (role === 'client' && isStaff(user)) return <Navigate to="/staff" replace />;
  return children;
}

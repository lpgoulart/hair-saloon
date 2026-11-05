import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Fetch on mount and whenever deps change. Returns { data, error, loading, reload, setData }. */
export function useApi(path, query, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const key = JSON.stringify(query || {});
  const load = useCallback(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return; }
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { query })
      .then((data) => n === seq.current && setState({ data, error: null, loading: false }))
      .catch((error) => n === seq.current && setState((s) => ({ ...s, error, loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, ...deps]);
  useEffect(load, [load]);
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

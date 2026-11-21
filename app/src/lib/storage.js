import { useSyncExternalStore, useCallback } from 'react';

const listeners = new Set();
const cache = new Map();

function read(key, fallback) {
  if (cache.has(key)) return cache.get(key);
  let v = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) v = JSON.parse(raw);
  } catch { /* storage unavailable */ }
  cache.set(key, v);
  return v;
}

function write(key, value) {
  cache.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

window.addEventListener('storage', (e) => {
  if (e.key) { cache.delete(e.key); listeners.forEach((l) => l()); }
});

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function useStored(key, fallback) {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback));
  const set = useCallback((v) => write(key, typeof v === 'function' ? v(read(key, fallback)) : v), [key, fallback]);
  return [value, set];
}

const EMPTY = [];
const MAX_RECENT = 12;
const MAX_HISTORY = 100;

export function useFavorites() {
  const [favs, setFavs] = useStored('sb:favorites', EMPTY);
  const toggle = useCallback((id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])), [setFavs]);
  return { favorites: favs, isFavorite: (id) => favs.includes(id), toggle, clear: () => setFavs([]) };
}

export function useHistory() {
  const [history, setHistory] = useStored('sb:history', EMPTY);
  const record = useCallback((id) => setHistory((h) => [{ id, at: Date.now() }, ...h].slice(0, MAX_HISTORY)), [setHistory]);
  const updateLastSession = useCallback((id, duration) => setHistory((h) => {
    const idx = h.findIndex((e) => e.id === id);
    if (idx === -1) return h;
    const updated = [...h];
    updated[idx] = { ...updated[idx], duration };
    return updated;
  }), [setHistory]);
  const getStats = useCallback((id) => {
    const sessions = history.filter((e) => e.id === id);
    const totalMs = sessions.reduce((sum, e) => sum + (e.duration || 0), 0);
    return { count: sessions.length, totalMs, lastAt: sessions[0]?.at };
  }, [history]);
  const recent = [];
  for (const h of history) {
    if (!recent.includes(h.id)) recent.push(h.id);
    if (recent.length >= MAX_RECENT) break;
  }
  return { history, recent, record, updateLastSession, getStats, clear: () => setHistory([]) };
}

export function useTheme() {
  const [theme, setTheme] = useStored('sb:theme', 'system');
  const apply = useCallback((t) => {
    setTheme(t);
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }, [setTheme]);
  return [theme, apply];
}

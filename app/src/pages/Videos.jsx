import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const API_BASES = [
  'https://pipedapi.ducks.party',
  'https://pipedapi.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
];

const CATS = [
  { id: 'trending', label: 'Trending', query: 'shorts trending' },
  { id: 'gaming',   label: 'Gaming',   query: 'shorts gaming' },
  { id: 'funny',    label: 'Funny',    query: 'shorts funny' },
  { id: 'music',    label: 'Music',    query: 'shorts music' },
  { id: 'sports',   label: 'Sports',   query: 'shorts sports' },
];

async function fetchShorts(query, nextpage = null) {
  const qs = new URLSearchParams({ q: query, filter: 'videos' });
  for (const base of API_BASES) {
    try {
      const path = nextpage
        ? `/nextpage/search?${qs}&nextpage=${encodeURIComponent(nextpage)}`
        : `/search?${qs}`;
      const r = await fetch(base + path, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const data = await r.json();
      const items = (data.items ?? []).filter((v) => v.type === 'stream' && v.url);
      if (items.length) return { items, nextpage: data.nextpage ?? null, base };
    } catch { /* try next */ }
  }
  throw new Error('Could not load videos — check your connection.');
}

async function fetchStream(videoId) {
  for (const base of API_BASES) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      // Combined (video+audio) MP4 stream
      const combined = (data.videoStreams ?? []).find(
        (s) => !s.videoOnly && s.mimeType && s.mimeType.includes('video/mp4'),
      );
      if (combined?.url) return combined.url;
      // Any non-videoOnly stream
      const any = (data.videoStreams ?? []).find((s) => !s.videoOnly);
      if (any?.url) return any.url;
    } catch { /* try next */ }
  }
  return null;
}

function vid(url = '') {
  const m = (url || '').match(/[?&]v=([^&]+)/);
  if (m) return m[1];
  const s = (url || '').match(/\/shorts\/([^?&/]+)/);
  if (s) return s[1];
  return url.replace('/watch?v=', '').split('&')[0];
}

function fmtV(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K views`;
  return `${n} views`;
}

function Short({ s, active, muted }) {
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamDone, setStreamDone] = useState(false);
  const videoRef = useRef(null);
  const id = vid(s.url);

  useEffect(() => {
    if (!active) {
      setStreamUrl(null);
      setStreamDone(false);
      return;
    }
    let cancelled = false;
    fetchStream(id).then((url) => {
      if (!cancelled) { setStreamUrl(url); setStreamDone(true); }
    });
    return () => { cancelled = true; };
  }, [active, id]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
    if (active) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [active, muted]);

  const showIframe = active && streamDone && !streamUrl;
  const iframeSrc = showIframe
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&playsinline=1`
    : null;

  return (
    <div className="short-item">
      <div className="short-player">
        {active && streamUrl ? (
          <video
            ref={videoRef}
            key={streamUrl}
            src={streamUrl}
            autoPlay
            muted={muted}
            loop
            playsInline
          />
        ) : iframeSrc ? (
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title={s.title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img src={s.thumbnail} alt={s.title} referrerPolicy="no-referrer" />
        )}
        <div className="short-info-bar">
          <p className="short-title">{s.title}</p>
          <span className="short-meta">
            {s.uploaderName}{s.views > 0 ? ` · ${fmtV(s.views)}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonShort() {
  return (
    <div className="short-snap-item">
      <div className="short-item"><div className="short-player skeleton" /></div>
    </div>
  );
}

export default function Videos() {
  useDocumentTitle('Shorts');
  const [cat, setCat] = useState('trending');
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [npToken, setNpToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const feedRef = useRef(null);
  const itemRefs = useRef([]);
  const obsRef = useRef(null);

  const loadCat = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setActiveIdx(0);
    setShorts([]);
    if (feedRef.current) feedRef.current.scrollTop = 0;
    try {
      const q = CATS.find((c) => c.id === id)?.query ?? 'shorts';
      const res = await fetchShorts(q);
      setShorts(res.items);
      setNpToken(res.nextpage);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCat(cat); }, [cat, loadCat]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !npToken) return;
    setLoadingMore(true);
    try {
      const q = CATS.find((c) => c.id === cat)?.query ?? 'shorts';
      const res = await fetchShorts(q, npToken);
      setShorts((prev) => [...prev, ...res.items]);
      setNpToken(res.nextpage);
    } catch { /* silent */ } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, npToken, cat]);

  useEffect(() => {
    if (!shorts.length) return;
    obsRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.5)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = Number(visible.target.dataset.idx);
        setActiveIdx(idx);
        if (idx >= shorts.length - 4) loadMore();
      },
      { threshold: [0.5, 1] },
    );
    obsRef.current = obs;
    itemRefs.current.forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [shorts, loadMore]);

  return (
    <div className="shorts-page">
      <div className="shorts-bar">
        <div className="chips" style={{ flex: 1, minWidth: 0 }}>
          {CATS.map((c) => (
            <button
              key={c.id}
              className={`chip${cat === c.id ? ' on' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          className="btn ghost shorts-mute-btn"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 16.73 19.73L19.73 22.73 21 21.46 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
        </button>
      </div>

      {loading ? (
        <div className="shorts-feed"><SkeletonShort /></div>
      ) : error ? (
        <div className="shorts-feed">
          <div className="short-snap-item">
            <div className="short-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty">
                <p className="muted">{error}</p>
                <button className="btn ghost mt" onClick={() => loadCat(cat)}>Try again</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="shorts-feed" ref={feedRef}>
          {shorts.map((s, i) => (
            <div
              key={s.url}
              className="short-snap-item"
              data-idx={i}
              ref={(el) => { itemRefs.current[i] = el; }}
            >
              <Short s={s} active={i === activeIdx} muted={muted} />
            </div>
          ))}
          {loadingMore && (
            <div className="short-snap-item">
              <div className="short-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

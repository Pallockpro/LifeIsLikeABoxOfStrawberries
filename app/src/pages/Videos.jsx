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
      if (items.length) { lastBase = base; return { items, nextpage: data.nextpage ?? null, base }; }
    } catch { /* try next */ }
  }
  throw new Error('Could not load videos — check your connection.');
}

function vid(url = '') {
  const m = (url || '').match(/[?&]v=([^&]+)/);
  if (m) return m[1];
  const short = (url || '').match(/\/shorts\/([^?&/]+)/);
  if (short) return short[1];
  return (url || '').replace('/watch?v=', '').split('&')[0];
}

function fmtV(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K views`;
  return `${n} views`;
}

let lastBase = API_BASES[0];
function orderedBases() {
  return [lastBase, ...API_BASES.filter((b) => b !== lastBase)];
}

const isMp4 = (s) => /mp4|m4a/i.test(`${s.mimeType || ''} ${s.format || ''}`);
const isAvc = (s) => /avc/i.test(`${s.codec || ''} ${s.mimeType || ''}`);
const height = (s) => s.height || parseInt(s.quality, 10) || 0;

/* Pick something every browser can decode: H.264 MP4 video, AAC/M4A audio */
function pickSources(data) {
  const vs = (data.videoStreams ?? []).filter((s) => s.url);
  const combined = vs
    .filter((s) => s.videoOnly === false && isMp4(s))
    .sort((a, b) => height(b) - height(a))[0];
  if (combined) return { video: combined.url };

  const videoOnly = vs.filter((s) => s.videoOnly && isMp4(s) && isAvc(s));
  const video = videoOnly.filter((s) => height(s) <= 720).sort((a, b) => height(b) - height(a))[0]
    ?? videoOnly.sort((a, b) => height(a) - height(b))[0];
  if (!video) return null;
  const as = (data.audioStreams ?? []).filter((s) => s.url);
  const audio = as.filter(isMp4).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  return { video: video.url, audio: audio?.url };
}

function PipedPlayer({ id, muted, onPlaying, onFail }) {
  const bases = useRef(orderedBases()).current;
  const [attempt, setAttempt] = useState(0);
  const [src, setSrc] = useState(null);
  const vRef = useRef(null);
  const aRef = useRef(null);
  const okRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    let alive = true;
    setSrc(null);
    (async () => {
      for (let i = attempt; i < bases.length; i++) {
        try {
          const r = await fetch(`${bases[i]}/streams/${id}`, { signal: AbortSignal.timeout(7000) });
          if (!r.ok) continue;
          const picked = pickSources(await r.json());
          if (picked) { if (alive) setSrc({ ...picked, i }); return; }
        } catch { /* try next */ }
      }
      if (alive) onFail();
    })();
    return () => { alive = false; };
  }, [id, attempt, bases, onFail]);

  const srcRef = useRef(src);
  srcRef.current = src;
  const failSrc = useCallback(() => {
    const cur = srcRef.current;
    if (!cur) return;
    setSrc(null);
    setAttempt(cur.i + 1);
  }, []);

  useEffect(() => {
    const v = vRef.current;
    if (!src || !v) return;
    okRef.current = false;
    v.muted = src.audio ? true : mutedRef.current;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    const t = setTimeout(() => { if (!okRef.current) failSrc(); }, 9000);
    return () => clearTimeout(t);
  }, [src, failSrc]);

  useEffect(() => {
    const v = vRef.current;
    const a = aRef.current;
    if (!v) return;
    if (a) { a.muted = muted; if (!muted && !v.paused) a.play().catch(() => {}); }
    else v.muted = muted;
  }, [muted, src]);

  if (!src) return null;
  const a = () => aRef.current;
  return (
    <>
      <video
        ref={vRef}
        key={src.video}
        src={src.video}
        playsInline
        muted
        loop
        preload="auto"
        onError={failSrc}
        onPlay={() => { a()?.play().catch(() => {}); }}
        onPause={() => a()?.pause()}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!okRef.current && v.currentTime > 0.1 && v.videoWidth > 0) { okRef.current = true; onPlaying(); }
          const au = a();
          if (au && Math.abs(au.currentTime - v.currentTime) > 0.35) au.currentTime = v.currentTime;
        }}
      />
      {src.audio && <audio ref={aRef} key={src.audio} src={src.audio} loop preload="auto" />}
    </>
  );
}

let ytApi;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApi) {
    ytApi = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => { ytApi = null; reject(new Error('YouTube API failed to load')); };
      document.head.appendChild(tag);
    });
  }
  return ytApi;
}

function YtPlayer({ id, title, muted, onPlaying, onFail }) {
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const playingRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    let alive = true;
    loadYT().then((YT) => {
      if (!alive || !iframeRef.current) return;
      playerRef.current = new YT.Player(iframeRef.current, {
        events: {
          onReady: (e) => {
            if (mutedRef.current) e.target.mute(); else e.target.unMute();
            e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING && !playingRef.current) {
              playingRef.current = true;
              setBlocked(false);
              onPlaying();
            }
          },
          onError: () => { if (alive) onFail(); },
        },
      });
    }).catch(() => { if (alive) onFail(); });
    const t = setTimeout(() => { if (alive && !playingRef.current) setBlocked(true); }, 6000);
    return () => { alive = false; clearTimeout(t); };
  }, [id, onPlaying, onFail]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p?.mute) return;
    if (muted) p.mute(); else p.unMute();
  }, [muted]);

  const origin = encodeURIComponent(window.location.origin);
  return (
    <>
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&playsinline=1&rel=0&loop=1&playlist=${id}&origin=${origin}`}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
      {blocked && (
        <button className="short-tap" onClick={() => playerRef.current?.playVideo?.()}>Tap to play</button>
      )}
    </>
  );
}

const SOURCE_LABEL = { piped: 'Piped', yt: 'YouTube', myt: 'm.youtube' };

/* Fallback chain: Piped streams → YouTube embed → m.youtube.com embed */
function Short({ s, index, active, muted, onSkip }) {
  const id = vid(s.url);
  const [mode, setMode] = useState('piped');
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setMode('piped'); setPlaying(false); }, [active, id]);

  const markPlaying = useCallback(() => setPlaying(true), []);
  const toYt = useCallback(() => { setPlaying(false); setMode('yt'); }, []);
  const toMyt = useCallback(() => { setPlaying(false); setMode('myt'); }, []);

  const cover = !active || (!playing && mode !== 'myt');

  return (
    <div className="short-item">
      <div className="short-player">
        {active && mode === 'piped' && (
          <PipedPlayer id={id} muted={muted} onPlaying={markPlaying} onFail={toYt} />
        )}
        {active && mode === 'yt' && (
          <YtPlayer id={id} title={s.title} muted={muted} onPlaying={markPlaying} onFail={toMyt} />
        )}
        {active && mode === 'myt' && (
          <iframe
            key={`m-${id}-${muted}`}
            src={`https://m.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0`}
            title={s.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
        {cover && (
          <img className="short-thumb" src={s.thumbnail} alt={s.title} referrerPolicy="no-referrer" />
        )}
        {active && cover && <span className="spinner short-spinner" />}
        {active && <span className="short-source">via {SOURCE_LABEL[mode]}</span>}
        {active && mode === 'myt' && (
          <div className="short-actions">
            <a href={`https://www.youtube.com/shorts/${id}`} target="_blank" rel="noreferrer">Open on YouTube</a>
            <button onClick={() => onSkip(index)}>Next ›</button>
          </div>
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

  const skipFrom = useCallback((i) => {
    itemRefs.current[i + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
              <Short s={s} active={i === activeIdx} muted={muted} index={i} onSkip={skipFrom} />
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { XIcon, PlayIcon } from '../components/Icons';

const API_BASES = [
  'https://pipedapi.ducks.party',
  'https://pipedapi.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
];

const TABS = [
  { id: 'trending', label: 'Trending', query: null },
  { id: 'shorts',   label: 'Shorts',   query: '#shorts' },
  { id: 'gaming',   label: 'Gaming',   query: 'gaming shorts highlights' },
  { id: 'music',    label: 'Music',    query: 'music videos 2024' },
];

async function fetchPiped(query) {
  for (const base of API_BASES) {
    try {
      const url = query
        ? `${base}/search?q=${encodeURIComponent(query)}&filter=videos`
        : `${base}/trending?region=US`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const data = await r.json();
      const items = Array.isArray(data) ? data : (data.items ?? []);
      if (items.length) return items;
    } catch { /* try next */ }
  }
  throw new Error('All video sources failed — check your connection.');
}

function getVideoId(url = '') {
  return url.replace('/watch?v=', '').split('&')[0];
}

function fmtViews(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K views`;
  return `${n} views`;
}

function fmtDur(s) {
  if (!s || s < 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function VideoPlayer({ video, onClose }) {
  const ref = useRef(null);
  const id = getVideoId(video.url);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="vid-dialog" onClose={onClose} onCancel={onClose}>
      <div className="vid-dialog-head">
        <div className="vid-dialog-title">
          <span>{video.title}</span>
          <small className="muted">{video.uploaderName}</small>
        </div>
        <button className="icon-btn sm" aria-label="Close" onClick={onClose}><XIcon /></button>
      </div>
      <div className="vid-player-wrap">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={video.title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </dialog>
  );
}

function VideoCard({ video, onPlay }) {
  const id = getVideoId(video.url);
  const dur = fmtDur(video.duration);
  return (
    <article className="vid-card" onClick={onPlay}>
      <div className="vid-thumb">
        <img src={video.thumbnail} alt={video.title} loading="lazy" referrerPolicy="no-referrer" />
        <div className="vid-play-btn"><PlayIcon width={16} height={16} /></div>
        {dur && <span className="vid-dur">{dur}</span>}
        {video.isShort && <span className="vid-shorts-badge">Shorts</span>}
      </div>
      <div className="vid-info">
        <p className="vid-title">{video.title}</p>
        <span className="muted small">{video.uploaderName}</span>
        {video.views > 0 && <span className="muted small">{fmtViews(video.views)}</span>}
        {video.uploadedDate && <span className="muted small">{video.uploadedDate}</span>}
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="vid-grid">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="vid-card vid-card-skeleton">
          <div className="vid-thumb skeleton" />
          <div className="vid-info">
            <div className="skeleton" style={{ height: 14, borderRadius: 6, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, borderRadius: 6, width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Videos() {
  useDocumentTitle('Videos');
  const [tab, setTab] = useState('trending');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback((query) => {
    setLoading(true);
    setError(null);
    fetchPiped(query)
      .then(setVideos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) return; // search handles its own fetch
    const t = TABS.find((t) => t.id === tab);
    load(t?.query ?? null);
  }, [tab, search, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) { setSearch(''); return; }
    setSearch(q);
    setTab('');
    load(q);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchInput('');
    setTab('trending');
  };

  return (
    <div className="container">
      <header className="page-head">
        <h1>Videos</h1>
        <p className="muted">Trending videos &amp; Shorts — sourced privately via open API</p>
      </header>

      <div className="vid-toolbar">
        <form className="vid-search-form" onSubmit={handleSearch}>
          <input
            className="vid-search-input"
            type="search"
            placeholder="Search videos…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search videos"
          />
          <button type="submit" className="btn primary">Search</button>
          {search && (
            <button type="button" className="btn ghost" onClick={clearSearch}>Clear</button>
          )}
        </form>

        {!search && (
          <div className="chips vid-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`chip${tab === t.id ? ' on' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {search && (
          <p className="muted small">Results for <strong>"{search}"</strong></p>
        )}
      </div>

      {loading ? <SkeletonGrid /> : error ? (
        <div className="empty">
          <p className="muted">{error}</p>
          <button className="btn ghost mt" onClick={() => load(TABS.find(t => t.id === tab)?.query ?? null)}>Try again</button>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty"><p className="muted">No videos found.</p></div>
      ) : (
        <div className="vid-grid">
          {videos.map((v) => (
            <VideoCard key={v.url} video={v} onPlay={() => setPlaying(v)} />
          ))}
        </div>
      )}

      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

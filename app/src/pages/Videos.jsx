import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/* ---------- Sources ---------- */

// Instances the Piped uptime tracker reports as up; the live lists below add/reorder at runtime
const PIPED_STATIC = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://piped-api.lunar.icu',
  'https://yapi.vyper.me',
  'https://api.looleh.xyz',
  'https://pipedapi.nosebs.ru',
  'https://api.piped.privacydev.net',
  'https://pipedapi.adminforge.de',
  'https://pdapi.vern.cc',
  'https://api.piped.yt',
  'https://pipedapi.drgns.space',
  'https://piapi.ggtyler.dev',
  'https://piped-api.codespace.cz',
  'https://pipedapi.reallyaweso.me',
  'https://pa.il.ax',
  'https://pipedapi.palveluntarjoaja.eu',
  'https://pipedapi.ngn.tf',
  'https://pipedapi.darkness.services',
  'https://pipedapi.owo.si',
  'https://pipedapi.orangenet.cc',
];
const PIPED_UPTIME = 'https://raw.githubusercontent.com/TeamPiped/piped-uptime/master/history/summary.json';
const PIPED_DIRECTORY = 'https://piped-instances.kavin.rocks/';
// tikwm.com without www sits behind a Cloudflare challenge that fetch() can't pass
const TIKWM = 'https://www.tikwm.com';

const CATS = [
  { id: 'trending', label: 'Trending', yt: 'shorts trending', tt: 'trending' },
  { id: 'gaming',   label: 'Gaming',   yt: 'shorts gaming',   tt: 'gaming' },
  { id: 'funny',    label: 'Funny',    yt: 'shorts funny',    tt: 'funny' },
  { id: 'music',    label: 'Music',    yt: 'shorts music',    tt: 'music' },
  { id: 'sports',   label: 'Sports',   yt: 'shorts sports',   tt: 'sports' },
];

const cache = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const goodBases = [];
let basesPromise;
function getBases() {
  if (!basesPromise) {
    basesPromise = (async () => {
      let live = [];
      const saved = cache.get('sb:piped-instances');
      if (saved && Date.now() - saved.t < 6 * 3600e3) {
        live = saved.list;
      } else {
        const getJson = (url) => fetch(url, { signal: AbortSignal.timeout(4000) }).then((r) => r.json());
        const [uptime, directory] = await Promise.allSettled([getJson(PIPED_UPTIME), getJson(PIPED_DIRECTORY)]);
        const pct = (v) => parseFloat(v) || 0;
        const fromUptime = uptime.status === 'fulfilled'
          ? uptime.value
            .filter((i) => i.status === 'up' && i.url)
            .sort((a, b) => pct(b.uptimeDay) - pct(a.uptimeDay))
            .map((i) => i.url.replace(/\/healthcheck\/?$/, ''))
          : [];
        const fromDirectory = directory.status === 'fulfilled'
          ? directory.value
            .filter((i) => i.api_url)
            .sort((a, b) => (b.uptime_24h ?? 0) - (a.uptime_24h ?? 0))
            .map((i) => i.api_url.replace(/\/+$/, ''))
          : [];
        live = [...new Set([...fromUptime, ...fromDirectory])];
        if (live.length) cache.set('sb:piped-instances', { t: Date.now(), list: live });
      }
      return [...new Set([...live, ...PIPED_STATIC])];
    })();
  }
  return basesPromise.then((all) => [...new Set([...goodBases, ...all])]);
}
function markGood(base) {
  const i = goodBases.indexOf(base);
  if (i === 0) return;
  if (i > 0) goodBases.splice(i, 1);
  goodBases.unshift(base);
}

/* Ask instances in parallel batches; the first valid answer wins */
async function racePiped(path, pick, { exclude = [], batch = 4, timeout = 6000, max = 24 } = {}) {
  const bases = (await getBases()).filter((b) => !exclude.includes(b)).slice(0, max);
  for (let i = 0; i < bases.length; i += batch) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const win = await Promise.any(bases.slice(i, i + batch).map(async (base) => {
        const r = await fetch(base + path, { signal: ctrl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const out = pick(await r.json());
        if (!out) throw new Error('empty');
        return { ...out, base };
      }));
      markGood(win.base);
      return win;
    } catch { /* next batch */ } finally {
      clearTimeout(timer);
      ctrl.abort();
    }
  }
  throw new Error('No Piped instance answered.');
}

function vid(url = '') {
  const m = (url || '').match(/[?&]v=([^&]+)/);
  if (m) return m[1];
  const short = (url || '').match(/\/shorts\/([^?&/]+)/);
  if (short) return short[1];
  return (url || '').replace('/watch?v=', '').split('&')[0];
}

async function searchYouTube(q, nextpage) {
  const qs = new URLSearchParams({ q, filter: 'videos' });
  const path = nextpage
    ? `/nextpage/search?${qs}&nextpage=${encodeURIComponent(nextpage)}`
    : `/search?${qs}`;
  return racePiped(path, (d) => {
    const items = (d.items ?? [])
      .filter((v) => v.type === 'stream' && v.url)
      .map((v) => ({
        kind: 'yt', key: `yt-${vid(v.url)}`, id: vid(v.url),
        title: v.title, thumbnail: v.thumbnail, author: v.uploaderName, views: v.views,
      }));
    return items.length ? { items, next: d.nextpage ?? null } : null;
  }, { timeout: 8000 });
}

/* tikwm allows 1 request/second and often takes 20s+ to answer */
let tikwmQueue = Promise.resolve();
let tikwmLast = 0;
function tikwmGet(path) {
  const run = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = tikwmLast + 1200 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      tikwmLast = Date.now();
      const r = await fetch(TIKWM + path, { signal: AbortSignal.timeout(35000) });
      if (!r.ok) throw new Error(`tikwm ${r.status}`);
      const d = await r.json();
      if (d.code === 0) return d;
      if (!/limit/i.test(d.msg || '')) throw new Error(d.msg || 'tikwm error');
    }
    throw new Error('tikwm rate limit');
  };
  const p = tikwmQueue.then(run, run);
  tikwmQueue = p.catch(() => {});
  return p;
}

function toTikTokItems(d) {
  const abs = (u) => (u && u.startsWith('/') ? TIKWM + u : u);
  const list = Array.isArray(d.data) ? d.data : d.data?.videos ?? [];
  // Photo slideshows have an audio-only "play" URL, so skip them
  return list.filter((v) => v.video_id && v.play && !v.images?.length).map((v) => ({
    kind: 'tt', key: `tt-${v.video_id}`, id: v.video_id,
    title: v.title || 'TikTok', thumbnail: abs(v.cover || v.origin_cover),
    author: v.author?.nickname || v.author?.unique_id, views: v.play_count,
    play: abs(v.play), alt: v.wmplay && v.wmplay !== v.play ? abs(v.wmplay) : null,
  }));
}

/*
 * `page` is null for the first page, then whatever the previous call returned as `next`:
 * { cursor } for keyword search, or { list: true } for the For You feed (random 10 per call).
 * When search is blocked (Cloudflare), the For You feed keeps the scroll going.
 */
async function searchTikTok(cat, page = null) {
  const cacheKey = `sb:tt-feed:${cat.id}`;
  const saved = page ? null : cache.get(cacheKey);
  // Signed CDN links last about a day; reuse a recent first page instantly
  if (saved && Date.now() - saved.t < 2 * 3600e3) return { items: saved.items, next: saved.next, cached: true };

  const useList = cat.id === 'trending' || page?.list;
  const attempts = useList
    ? [['list', '/api/feed/list?region=US&count=30']]
    : [
      ['search', `/api/feed/search?keywords=${encodeURIComponent(cat.tt)}&count=20&cursor=${page?.cursor ?? 0}`],
      ['list', '/api/feed/list?region=US&count=30'],
    ];
  for (const [kind, path] of attempts) {
    try {
      const d = await tikwmGet(path);
      const items = toTikTokItems(d);
      if (!items.length) continue;
      const next = kind === 'list'
        ? { list: true }
        : (d.data?.hasMore ? { cursor: d.data.cursor } : { list: true });
      if (!page) cache.set(cacheKey, { t: Date.now(), items, next });
      return { items, next };
    } catch { /* try the next option */ }
  }
  // Stale feed still works: expired CDN links fall back to the TikTok player by video id
  if (saved) return { items: saved.items, next: saved.next, cached: true };
  throw new Error('TikTok is unavailable right now — try again in a minute.');
}

const isMp4 = (s) => /mp4|m4a/i.test(`${s.mimeType || ''} ${s.format || ''}`);
const isAvc = (s) => /avc/i.test(`${s.codec || ''} ${s.mimeType || ''}`);
const height = (s) => s.height || parseInt(s.quality, 10) || 0;

/* H.264 MP4 + AAC only: VP9/AV1 render black in some browsers */
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
  const audio = (data.audioStreams ?? [])
    .filter((s) => s.url && isMp4(s))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  return { video: video.url, audio: audio?.url };
}

const streamCache = new Map();
function getStreams(id, exclude = []) {
  if (!exclude.length && streamCache.has(id)) return streamCache.get(id);
  const p = racePiped(`/streams/${id}`, pickSources, { exclude, timeout: 5000 });
  if (!exclude.length) {
    streamCache.set(id, p);
    p.catch(() => streamCache.delete(id));
  }
  return p;
}

function fmtV(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K views`;
  return `${n} views`;
}

/* ---------- Players ---------- */

const PlayIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);

/* Native <video> (optionally with a synced <audio>); fails if no frames decode in time */
function NativeVideo({ video, audio, muted, onPlaying, onFail, timeout = 8000 }) {
  const vRef = useRef(null);
  const aRef = useRef(null);
  const okRef = useRef(false);
  const blockedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const v = vRef.current;
    okRef.current = false;
    blockedRef.current = false;
    v.muted = audio ? true : mutedRef.current;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => { blockedRef.current = true; setPaused(true); });
    });
    const t = setTimeout(() => {
      if (!okRef.current && !blockedRef.current) onFail();
    }, timeout);
    return () => clearTimeout(t);
  }, [video, audio, timeout, onFail]);

  useEffect(() => {
    const v = vRef.current;
    const a = aRef.current;
    if (a) {
      a.muted = muted;
      if (!muted && !v.paused) a.play().catch(() => {});
    } else {
      v.muted = muted;
    }
  }, [muted]);

  const toggle = () => {
    const v = vRef.current;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const progRef = useRef(null);
  const seek = (e) => {
    const v = vRef.current;
    if (!v.duration) return;
    const box = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - box.left) / box.width) * v.duration;
  };

  return (
    <>
      <video
        ref={vRef}
        src={video}
        playsInline
        muted
        loop
        preload="auto"
        onClick={toggle}
        onError={onFail}
        onPlay={() => { setPaused(false); aRef.current?.play().catch(() => {}); }}
        onPause={() => { setPaused(true); aRef.current?.pause(); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!okRef.current && v.currentTime > 0.1 && v.videoWidth > 0) {
            okRef.current = true;
            onPlaying();
          }
          const au = aRef.current;
          if (au && Math.abs(au.currentTime - v.currentTime) > 0.35) au.currentTime = v.currentTime;
          if (progRef.current && v.duration) progRef.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
        }}
      />
      <div className="short-progress" onClick={seek} role="presentation">
        <div className="short-progress-fill" ref={progRef} />
      </div>
      {audio && <audio ref={aRef} src={audio} loop preload="auto" />}
      {paused && (
        <button className="short-play" onClick={toggle} aria-label="Play"><PlayIcon /></button>
      )}
    </>
  );
}

// Public Piped instances are often blocked by YouTube for streams (search still works)
let pipedStreamMisses = 0;
const pipedStreamsDown = () => pipedStreamMisses >= 2;

function PipedPlayer({ id, muted, onPlaying, onFail }) {
  const [src, setSrc] = useState(null);
  const [tries, setTries] = useState({ n: 0, exclude: [] });
  const srcRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    srcRef.current = null;
    if (tries.n >= 3) { onFail(); return undefined; }
    getStreams(id, tries.exclude).then(
      (s) => { pipedStreamMisses = 0; if (alive) { srcRef.current = s; setSrc(s); } },
      () => { if (!tries.n) pipedStreamMisses += 1; if (alive) onFail(); },
    );
    return () => { alive = false; };
  }, [id, tries, onFail]);

  const bad = useCallback(() => {
    const cur = srcRef.current;
    if (!cur) return;
    srcRef.current = null;
    streamCache.delete(id);
    setTries((t) => ({ n: t.n + 1, exclude: [...t.exclude, cur.base] }));
  }, [id]);

  if (!src) return null;
  return (
    <NativeVideo key={src.video} video={src.video} audio={src.audio} muted={muted} onPlaying={onPlaying} onFail={bad} />
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
  const readyRef = useRef(false);
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
            readyRef.current = true;
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
    const tap = setTimeout(() => { if (alive && !playingRef.current) setBlocked(true); }, 5000);
    // Never loaded at all (network blocks YouTube) → move on
    const dead = setTimeout(() => { if (alive && !readyRef.current) onFail(); }, 10000);
    return () => { alive = false; clearTimeout(tap); clearTimeout(dead); };
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

function EmbedFrame({ src, title }) {
  return (
    <iframe
      src={src}
      title={title}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}

const LABEL = { piped: 'Piped', yt: 'YouTube', myt: 'm.youtube', tt: 'TikTok', tt2: 'TikTok', ttembed: 'TikTok player' };

/*
 * YouTube items: Piped streams → YouTube embed → m.youtube embed
 * TikTok items:  direct MP4 → official TikTok player
 */
function Short({ item, index, active, muted, onSkip, onAlive, onDead }) {
  const first = item.kind === 'tt' ? 'tt' : (pipedStreamsDown() ? 'yt' : 'piped');
  const [mode, setMode] = useState(first);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setMode(first); setPlaying(false); }, [active, item.key, first]);

  const markPlaying = useCallback(() => { setPlaying(true); onAlive(); }, [onAlive]);
  const toYt = useCallback(() => { setPlaying(false); setMode('yt'); }, []);
  const toMyt = useCallback(() => { setPlaying(false); setMode('myt'); onDead(index); }, [onDead, index]);
  const toTtEmbed = useCallback(() => { setPlaying(false); setMode('ttembed'); }, []);
  const toTtAlt = useCallback(() => { setPlaying(false); setMode(item.alt ? 'tt2' : 'ttembed'); }, [item.alt]);

  const frameMode = mode === 'myt' || mode === 'ttembed';
  const cover = !active || (!playing && !frameMode);
  const m = muted ? 1 : 0;

  return (
    <div className="short-item">
      <div className="short-player">
        {active && mode === 'piped' && (
          <PipedPlayer id={item.id} muted={muted} onPlaying={markPlaying} onFail={toYt} />
        )}
        {active && mode === 'yt' && (
          <YtPlayer id={item.id} title={item.title} muted={muted} onPlaying={markPlaying} onFail={toMyt} />
        )}
        {active && mode === 'myt' && (
          <EmbedFrame key={`m${m}`} title={item.title} src={`https://m.youtube.com/embed/${item.id}?autoplay=1&mute=${m}&playsinline=1&rel=0`} />
        )}
        {active && mode === 'tt' && (
          <NativeVideo key={item.play} video={item.play} muted={muted} onPlaying={markPlaying} onFail={toTtAlt} />
        )}
        {active && mode === 'tt2' && (
          <NativeVideo key={item.alt} video={item.alt} muted={muted} onPlaying={markPlaying} onFail={toTtEmbed} />
        )}
        {active && mode === 'ttembed' && (
          <EmbedFrame key={`t${m}`} title={item.title} src={`https://www.tiktok.com/player/v1/${item.id}?autoplay=1&loop=1&muted=${m}&controls=1&music_info=0&description=0&rel=0`} />
        )}
        {cover && (
          <img className="short-thumb" src={item.thumbnail} alt={item.title} referrerPolicy="no-referrer" />
        )}
        {active && cover && <span className="spinner short-spinner" />}
        {active && <span className="short-source">via {LABEL[mode]}</span>}
        {active && frameMode && (
          <div className="short-actions">
            <a
              href={item.kind === 'tt' ? `https://www.tiktok.com/@/video/${item.id}` : `https://www.youtube.com/shorts/${item.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
            <button onClick={() => onSkip(index)}>Next ›</button>
          </div>
        )}
        <div className="short-info-bar">
          <p className="short-title">{item.title}</p>
          <span className="short-meta">
            {item.author}{item.views > 0 ? ` · ${fmtV(item.views)}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonShort({ text }) {
  return (
    <div className="short-snap-item">
      <div className="short-item">
        <div className="short-player skeleton">
          {text && <p className="short-loading-text">{text}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Videos() {
  useDocumentTitle('Shorts');
  const [source, setSource] = useState('yt');
  const [cat, setCat] = useState('trending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [next, setNext] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [notice, setNotice] = useState(null);
  const [retry, setRetry] = useState(0);
  const feedRef = useRef(null);
  const itemRefs = useRef([]);
  const reqRef = useRef(0);
  const deadRef = useRef(0);

  const catObj = CATS.find((c) => c.id === cat) ?? CATS[0];

  const switchToTikTok = useCallback((why) => {
    setNotice(why);
    setSource('tt');
  }, []);

  useEffect(() => {
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setNext(null);
    setLoadingMore(false);
    setMoreError(false);
    setActiveIdx(0);
    deadRef.current = 0;
    itemRefs.current = [];
    if (feedRef.current) feedRef.current.scrollTop = 0;
    (async () => {
      try {
        let res;
        if (source === 'yt') {
          try {
            res = await searchYouTube(catObj.yt);
          } catch {
            if (req === reqRef.current) switchToTikTok('YouTube sources are down — showing TikTok instead.');
            return;
          }
        } else {
          res = await searchTikTok(catObj);
        }
        if (req !== reqRef.current) return;
        setItems(res.items);
        setNext(res.next);
        setLoading(false);
      } catch (e) {
        if (req !== reqRef.current) return;
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [source, catObj, retry, switchToTikTok]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const loadMore = useCallback(async () => {
    if (loadingMore || next === null) return;
    const req = reqRef.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      let page = next;
      // The For You feed is random, so a page can be all repeats; ask again a few times
      for (let tries = 0; tries < 3; tries++) {
        const res = source === 'yt' ? await searchYouTube(catObj.yt, page) : await searchTikTok(catObj, page);
        if (req !== reqRef.current) return;
        const seen = new Set(itemsRef.current.map((p) => p.key));
        const fresh = res.items.filter((it) => !seen.has(it.key));
        page = res.next;
        if (fresh.length || page === null) {
          setItems((prev) => [...prev, ...fresh]);
          setNext(page);
          return;
        }
      }
      setNext(page);
      setMoreError(true);
    } catch {
      if (req === reqRef.current) setMoreError(true);
    } finally {
      if (req === reqRef.current) setLoadingMore(false);
    }
  }, [loadingMore, next, source, catObj]);

  // Keep a buffer of upcoming videos so the feed never runs dry (TikTok pages take a while)
  const buffer = source === 'tt' ? 8 : 5;
  useEffect(() => {
    if (loading || moreError || !items.length) return;
    if (items.length - activeIdx <= buffer) loadMore();
  }, [loading, moreError, items.length, activeIdx, buffer, loadMore]);

  useEffect(() => {
    if (!items.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.5)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveIdx(Number(visible.target.dataset.idx));
      },
      { root: feedRef.current, threshold: [0.5, 1] },
    );
    itemRefs.current.forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [items]);

  // Warm up the next Short so it starts instantly when scrolled to
  useEffect(() => {
    const upcoming = items[activeIdx + 1];
    if (upcoming?.kind === 'yt' && !pipedStreamsDown()) getStreams(upcoming.id).catch(() => {});
    if (upcoming?.thumbnail) new Image().src = upcoming.thumbnail;
  }, [activeIdx, items]);

  // Scroll only the feed: scrollIntoView would also scroll the page and hide the top bar
  const goTo = useCallback((i) => {
    const feed = feedRef.current;
    const el = itemRefs.current[i];
    if (!feed || !el) return;
    const top = el.getBoundingClientRect().top - feed.getBoundingClientRect().top + feed.scrollTop;
    feed.scrollTo({ top, behavior: 'smooth' });
  }, []);
  const skipFrom = useCallback((i) => goTo(i + 1), [goTo]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); goTo(activeIdx + 1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goTo(Math.max(0, activeIdx - 1)); }
      if (e.key === 'm') setMuted((x) => !x);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, goTo]);

  const onAlive = useCallback(() => { deadRef.current = 0; }, []);
  const onDead = useCallback(() => {
    deadRef.current += 1;
    if (source === 'yt' && deadRef.current >= 2) {
      switchToTikTok("YouTube videos won't play on this network — switched to TikTok.");
    }
  }, [source, switchToTikTok]);

  return (
    <div className="shorts-page">
      <div className="shorts-bar">
        <div className="shorts-source-toggle" role="group" aria-label="Video source">
          <button className={source === 'yt' ? 'on' : ''} onClick={() => setSource('yt')}>YouTube</button>
          <button className={source === 'tt' ? 'on' : ''} onClick={() => setSource('tt')}>TikTok</button>
        </div>
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
          onClick={() => setMuted((x) => !x)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 16.73 19.73L19.73 22.73 21 21.46 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
        </button>
      </div>
      {notice && <div className="shorts-notice" role="status">{notice}</div>}
      {!loading && !error && items.length > 0 && (
        <div className="shorts-nav">
          <button aria-label="Previous video" disabled={activeIdx === 0} onClick={() => goTo(activeIdx - 1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" /></svg>
          </button>
          <button aria-label="Next video" onClick={() => goTo(activeIdx + 1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
          </button>
        </div>
      )}

      {loading ? (
        <div className="shorts-feed">
          <SkeletonShort text={source === 'tt' ? 'Loading TikTok… this source can take up to 30 seconds.' : 'Loading Shorts…'} />
        </div>
      ) : error ? (
        <div className="shorts-feed">
          <div className="short-snap-item">
            <div className="short-item">
              <div className="empty">
                <p className="muted">{error}</p>
                <div className="row-gap mt">
                  <button className="btn ghost" onClick={() => setRetry((r) => r + 1)}>Try again</button>
                  <button className="btn ghost" onClick={() => setSource(source === 'yt' ? 'tt' : 'yt')}>
                    Try {source === 'yt' ? 'TikTok' : 'YouTube'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="shorts-feed" ref={feedRef}>
          {items.map((it, i) => (
            <div
              key={it.key}
              className="short-snap-item"
              data-idx={i}
              ref={(el) => { itemRefs.current[i] = el; }}
            >
              <Short
                item={it}
                index={i}
                active={i === activeIdx}
                muted={muted}
                onSkip={skipFrom}
                onAlive={onAlive}
                onDead={onDead}
              />
            </div>
          ))}
          <div className="short-snap-item">
            <div className="short-item">
              <div className="short-player short-end">
                {moreError ? (
                  <>
                    <p>Couldn't load more right now.</p>
                    <button className="btn primary" onClick={() => setMoreError(false)}>Try again</button>
                  </>
                ) : loadingMore || next !== null ? (
                  <>
                    <span className="spinner" />
                    <p>Finding more {source === 'tt' ? 'TikToks' : 'Shorts'}…</p>
                    {source === 'tt' && <small>TikTok can take a little while — hang tight.</small>}
                  </>
                ) : (
                  <>
                    <p>You're all caught up.</p>
                    <button className="btn ghost" onClick={() => setSource(source === 'yt' ? 'tt' : 'yt')}>
                      Watch {source === 'yt' ? 'TikTok' : 'YouTube Shorts'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { memo, useState } from 'react';

// Each category gets a muted, distinct palette: [background, mid, light].
const PALETTES = {
  Action: ['#3B2A2F', '#C9475A', '#F2C3B8'],
  Adventure: ['#24372E', '#5E9A6E', '#E5D9B6'],
  Arcade: ['#2B2740', '#7A6CD6', '#F4C86A'],
  Puzzle: ['#21344A', '#4F8FC0', '#E8EEF2'],
  Racing: ['#3A2A1E', '#E07A3F', '#F6E3C8'],
  Sports: ['#1F3A33', '#3FA27E', '#F3EBD3'],
  Strategy: ['#33302A', '#B49253', '#EFE6D2'],
  Multiplayer: ['#2D2337', '#C25C8F', '#F5D5E1'],
  Simulation: ['#263238', '#5AA3A0', '#F0E7D8'],
  Casual: ['#3A2830', '#E58C8A', '#FBE8D9'],
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let s = seed;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

function Pattern({ kind, r, mid, light }) {
  switch (kind) {
    case 0: // stacked rings
      return <g fill="none" stroke={mid} strokeWidth="10" opacity=".9">{[0, 1, 2, 3].map((i) => <circle key={i} cx={240 + r() * 60} cy={40 + r() * 60} r={30 + i * 34} opacity={1 - i * 0.2} />)}</g>;
    case 1: // diagonal bands
      return <g>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={110 + i * 46} y={-60} width={22} height={320} fill={i % 2 ? light : mid} opacity={i % 2 ? 0.2 : 0.85} transform="rotate(28 200 90)" />)}</g>;
    case 2: // dot grid
      return <g fill={light} opacity=".35">{Array.from({ length: 70 }, (_, i) => <circle key={i} cx={150 + (i % 10) * 18} cy={14 + Math.floor(i / 10) * 18} r={r() > 0.7 ? 4 : 2} />)}<circle cx="260" cy="120" r="64" fill={mid} opacity="1" /></g>;
    case 3: // stepped blocks
      return <g>{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={160 + i * 32} y={180 - (i + 1) * 22 - r() * 20} width={28} height={200} rx={3} fill={mid} opacity={0.5 + i * 0.09} />)}</g>;
    case 4: // big wedge + small square
      return <g><path d={`M180 180 L320 ${10 + r() * 30} L320 180 Z`} fill={mid} /><rect x={190 + r() * 40} y={30 + r() * 30} width="34" height="34" rx="4" fill={light} opacity=".85" transform="rotate(15 210 50)" /></g>;
    default: // arcs
      return <g fill="none" strokeLinecap="round" strokeWidth="14">{[0, 1, 2].map((i) => <path key={i} d={`M${150 + i * 30} 180 A ${110 - i * 20} ${110 - i * 20} 0 0 1 ${330} ${70 + i * 20}`} stroke={i === 1 ? light : mid} opacity={i === 1 ? 0.5 : 0.9} />)}</g>;
  }
}

function initials(title) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (/^\d/.test(words[0] || '')) return words[0].slice(0, 4);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}

function GameThumbSVG({ game, className }) {
  const [bg, mid, light] = PALETTES[game.category] || PALETTES.Casual;
  const h = hash(game.id);
  const r = rng(h);
  const kind = h % 6;
  return (
    <svg className={`thumb ${className}`} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={game.title}>
      <rect width="320" height="180" fill={bg} />
      <Pattern kind={kind} r={r} mid={mid} light={light} />
      <text x="22" y="150" fill={light} fontFamily="Plus Jakarta Sans, system-ui, sans-serif" fontWeight="800" fontSize="64" letterSpacing="-2">{initials(game.title)}</text>
    </svg>
  );
}

function GameThumb({ game, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (game.thumb && !failed) {
    return (
      <img
        className={`thumb ${className}`}
        src={game.thumb}
        alt={game.title}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <GameThumbSVG game={game} className={className} />;
}

export default memo(GameThumb);

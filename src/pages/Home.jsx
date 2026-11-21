import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import SearchBox from '../components/SearchBox';
import { GameGrid, GameRow, SectionHeader } from '../components/Sections';
import { CATEGORIES, games, getGame, sortGames } from '../data/games';
import { useHistory } from '../lib/storage';
import { useDocumentTitle } from '../lib/useDocumentTitle';

function useRecommended(recent) {
  return useMemo(() => {
    const played = recent.map(getGame).filter(Boolean);
    const cats = played.map((g) => g.category);
    const pool = sortGames(games).filter((g) => !recent.includes(g.id));
    if (!cats.length) {
      // No history yet: a spread of top games across different categories.
      const seen = new Set();
      return pool.filter((g) => !seen.has(g.category) && seen.add(g.category)).slice(0, 6);
    }
    const preferred = pool.filter((g) => cats.includes(g.category));
    return [...preferred, ...pool.filter((g) => !cats.includes(g.category))].slice(0, 6);
  }, [recent]);
}

const CAT_GLYPHS = {
  Action: 'M5 19 19 5M14 5h5v5', Adventure: 'M3 20 9 8l4 6 3-4 5 10Z', Arcade: 'M6 12h4M8 10v4M15 11h.01M18 13h.01M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z',
  Puzzle: 'M4 4h7v3a2 2 0 1 0 4 0V4h5v7h-3a2 2 0 1 0 0 4h3v5H4Z', Racing: 'M4 20V4m0 0h14l-3 4 3 4H4', Sports: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  Strategy: 'M8 21h8M10 17h4l1-6h-6Zm-1-6 1-4h4l1 4M12 3v4', Multiplayer: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5M3 20c0-3 3-5 6-5s6 2 6 5m2-5c2 0 4 1.5 4 4',
  Simulation: 'M4 18h16M6 18V9l6-4 6 4v9M10 18v-5h4v5', Casual: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-7c1.5 2 4.5 2 6 0M9 9h.01M15 9h.01',
};

export default function Home() {
  useDocumentTitle();
  const { recent } = useHistory();
  const recommended = useRecommended(recent);
  const popular = useMemo(() => sortGames(games, 'popular').slice(0, 14), []);
  const fresh = useMemo(() => sortGames(games, 'newest').slice(0, 14), []);
  const continuePlaying = recent.map(getGame).filter(Boolean).slice(0, 8);

  return (
    <div className="container">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Free browser games</p>
          <h1>Welcome to Strawberry.</h1>
          <p className="hero-sub">Your next favorite game is just a click away.</p>
          <SearchBox size="lg" placeholder="Search thousands of games..." suggest />
          <div className="hero-quick">
            <span className="muted small">Try</span>
            {['Slope', 'Retro Bowl', 'Minecraft', '2048'].map((t) => (
              <Link key={t} className="chip sm" to={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>
            ))}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="var(--berry-soft)" />
            <g transform="translate(36 34) scale(4)">
              <path fill="var(--berry)" d="M16 29.5c-6.2-2.6-11-8.6-10.6-15C5.7 10.4 9.2 8.6 12.4 9.3c1.4.3 2.5.8 3.6.8s2.2-.5 3.6-.8c3.2-.7 6.7 1.1 7 5.2.4 6.4-4.4 12.4-10.6 15Z" />
              <path fill="rgba(0,0,0,.1)" d="M16 29.5c4.3-3.2 7.6-8.5 7.7-14.6.1-2.4-.8-4.4-2.3-5.5 2.9-.1 5.6 1.8 5.8 5.1.4 6.4-4.4 12.4-10.6 15Z" />
              <path fill="var(--leaf)" d="M16 11.2 10.6 8.4l3.1-.6-1.6-2.9L16 7l3.9-2.1-1.6 2.9 3.1.6Z" />
              <path fill="none" stroke="var(--leaf)" strokeWidth="1.4" strokeLinecap="round" d="M16 7c0-1.8.5-3.2 1.7-4.4" />
              <g fill="#FBE3C9"><ellipse cx="11" cy="14.5" rx=".7" ry="1" /><ellipse cx="16" cy="14" rx=".7" ry="1" /><ellipse cx="21" cy="14.5" rx=".7" ry="1" /><ellipse cx="13.4" cy="19" rx=".7" ry="1" /><ellipse cx="18.6" cy="19" rx=".7" ry="1" /><ellipse cx="9.6" cy="19.5" rx=".6" ry=".9" /><ellipse cx="22.4" cy="19.5" rx=".6" ry=".9" /><ellipse cx="16" cy="23.5" rx=".7" ry="1" /></g>
            </g>
          </svg>
        </div>
      </section>

      {continuePlaying.length > 0 && <GameRow title="Jump back in" to="/library" games={continuePlaying} />}

      <section className="section">
        <SectionHeader title="Recommended for you" subtitle={recent.length ? 'Based on what you’ve played.' : 'A few good places to start.'} to="/explore" linkLabel="Explore all" />
        <GameGrid games={recommended} variant="featured" />
      </section>

      <GameRow title="Popular right now" to="/explore/trending" games={popular} />
      <GameRow title="Recently added" to="/explore/new" games={fresh} />

      <section className="section">
        <SectionHeader title="Browse categories" />
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <Link key={c} to={`/explore?category=${c}`} className="cat-tile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CAT_GLYPHS[c]} /></svg>
              <span>{c}</span>
              <small className="muted">{games.filter((g) => g.category === c).length}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

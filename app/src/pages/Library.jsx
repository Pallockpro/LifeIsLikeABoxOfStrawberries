import { Link } from 'react-router-dom';
import { EmptyState, GameGrid, SectionHeader } from '../components/Sections';
import GameThumb from '../components/GameThumb';
import { getGame } from '../data/games';
import { useFavorites, useHistory } from '../lib/storage';
import { useDocumentTitle } from '../lib/useDocumentTitle';

function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d} d ago`;
  return new Date(t).toLocaleDateString();
}

function fmtDuration(ms) {
  if (!ms) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export default function Library() {
  useDocumentTitle('Library');
  const { favorites, clear: clearFavs } = useFavorites();
  const { history, recent, getStats, clear: clearHistory } = useHistory();
  const favGames = favorites.map(getGame).filter(Boolean);
  const recentGames = recent.map(getGame).filter(Boolean);
  const log = history.slice(0, 30).map((h) => ({ ...h, game: getGame(h.id) })).filter((h) => h.game);

  return (
    <div className="container">
      <header className="page-head">
        <h1>Your library</h1>
        <p className="muted">Favorites and history are saved in this browser.</p>
      </header>

      <section className="section">
        <SectionHeader title="Favorites" />
        {favGames.length ? <GameGrid games={favGames} variant="compact" /> : (
          <EmptyState title="No favorites yet" action={<Link className="btn ghost" to="/explore">Find something to play</Link>}>
            Tap the heart on any game page to keep it here.
          </EmptyState>
        )}
        {favGames.length > 0 && <button className="btn ghost subtle mt" onClick={clearFavs}>Clear favorites</button>}
      </section>

      <section className="section">
        <SectionHeader title="Recently played" />
        {recentGames.length ? (
          <ul className="history">
            {recentGames.map((game) => {
              const s = getStats(game.id);
              return (
                <li key={game.id}>
                  <Link to={`/game/${game.id}`}>
                    <span className="suggest-thumb"><GameThumb game={game} /></span>
                    <span className="suggest-text">
                      <strong>{game.title}</strong>
                      <small>{game.category}</small>
                    </span>
                    <span className="history-stats">
                      {s.count > 0 && <span className="muted small">{s.count}×</span>}
                      {s.totalMs > 0 && <span className="muted small">{fmtDuration(s.totalMs)}</span>}
                      {s.lastAt && <time className="muted small">{timeAgo(s.lastAt)}</time>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">Nothing played yet.</p>}
      </section>

      {log.length > 0 && (
        <section className="section">
          <SectionHeader title="Play history" />
          <ul className="history">
            {log.map((h) => (
              <li key={h.at}>
                <Link to={`/game/${h.id}`}>
                  <span className="suggest-thumb"><GameThumb game={h.game} /></span>
                  <span className="suggest-text"><strong>{h.game.title}</strong><small>{h.game.category}</small></span>
                  <span className="history-stats">
                    {h.duration && <span className="muted small">{fmtDuration(h.duration)}</span>}
                    <time className="muted small">{timeAgo(h.at)}</time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button className="btn ghost subtle mt" onClick={clearHistory}>Clear history</button>
        </section>
      )}
    </div>
  );
}

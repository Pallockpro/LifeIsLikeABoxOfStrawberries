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

export default function Library() {
  useDocumentTitle('Library');
  const { favorites, clear: clearFavs } = useFavorites();
  const { history, recent, clear: clearHistory } = useHistory();
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
        {recentGames.length ? <GameGrid games={recentGames} variant="compact" /> : <p className="muted">Nothing played yet.</p>}
      </section>

      {log.length > 0 && (
        <section className="section">
          <SectionHeader title="History" />
          <ul className="history">
            {log.map((h) => (
              <li key={h.at}>
                <Link to={`/game/${h.id}`}>
                  <span className="suggest-thumb"><GameThumb game={h.game} /></span>
                  <span className="suggest-text"><strong>{h.game.title}</strong><small>{h.game.category}</small></span>
                  <time className="muted small">{timeAgo(h.at)}</time>
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

import { Link } from 'react-router-dom';
import GameThumb from './GameThumb';
import { HeartIcon, PlayIcon } from './Icons';
import { useFavorites } from '../lib/storage';

export default function GameCard({ game, variant = 'default' }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(game.id);
  return (
    <div className={`card card-${variant}`}>
      <Link to={`/game/${game.id}`} className="card-link">
        <div className="card-media">
          <GameThumb game={game} />
          <span className="card-play" aria-hidden="true"><PlayIcon width={16} height={16} /></span>
          {game.original && <span className="badge">Original</span>}
        </div>
        <div className="card-body">
          <h3 className="card-title">{game.title}</h3>
          {variant !== 'compact' && <p className="card-desc">{game.description}</p>}
          <span className="card-cat">{game.category}</span>
        </div>
      </Link>
      <button
        type="button"
        className={`card-fav${fav ? ' on' : ''}`}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
        title={fav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={() => toggle(game.id)}
      >
        <HeartIcon width={16} height={16} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <div className="card-media skeleton" />
      <div className="card-body"><div className="skeleton line" /><div className="skeleton line short" /></div>
    </div>
  );
}

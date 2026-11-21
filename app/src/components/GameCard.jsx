import { Link } from 'react-router-dom';
import GameThumb from './GameThumb';
import { PlayIcon } from './Icons';

export default function GameCard({ game, variant = 'default' }) {
  return (
    <Link to={`/game/${game.id}`} className={`card card-${variant}`}>
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

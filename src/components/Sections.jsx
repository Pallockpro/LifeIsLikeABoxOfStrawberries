import { useRef } from 'react';
import { Link } from 'react-router-dom';
import GameCard from './GameCard';
import { ChevronLeft, ChevronRight } from './Icons';

export function SectionHeader({ title, subtitle, to, linkLabel = 'View all' }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {to && <Link className="text-link" to={to}>{linkLabel} <ChevronRight width={14} height={14} /></Link>}
    </div>
  );
}

export function GameRow({ title, subtitle, to, games }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  if (!games.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <div className="row-actions">
          {to && <Link className="text-link" to={to}>View all <ChevronRight width={14} height={14} /></Link>}
          <button className="icon-btn sm" onClick={() => scroll(-1)} aria-label="Scroll left"><ChevronLeft /></button>
          <button className="icon-btn sm" onClick={() => scroll(1)} aria-label="Scroll right"><ChevronRight /></button>
        </div>
      </div>
      <div className="row" ref={ref}>
        {games.map((g) => <GameCard key={g.id} game={g} variant="compact" />)}
      </div>
    </section>
  );
}

export function GameGrid({ games, variant = 'default' }) {
  return <div className={`grid grid-${variant}`}>{games.map((g) => <GameCard key={g.id} game={g} variant={variant} />)}</div>;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <svg width="56" height="56" viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.4" d="M16 29.5c-6.2-2.6-11-8.6-10.6-15C5.7 10.4 9.2 8.6 12.4 9.3c1.4.3 2.5.8 3.6.8s2.2-.5 3.6-.8c3.2-.7 6.7 1.1 7 5.2.4 6.4-4.4 12.4-10.6 15Z" /><path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" d="M16 11.2 10.6 8.4l3.1-.6-1.6-2.9L16 7l3.9-2.1-1.6 2.9 3.1.6Z" /></svg>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft width={16} height={16} /> Previous</button>
      <span className="muted">Page {page} of {pages}</span>
      <button className="btn ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next <ChevronRight width={16} height={16} /></button>
    </nav>
  );
}

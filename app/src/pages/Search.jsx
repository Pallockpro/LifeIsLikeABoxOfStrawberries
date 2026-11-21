import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import { EmptyState, GameGrid, SectionHeader } from '../components/Sections';
import { CATEGORIES, games, searchGames, sortGames } from '../data/games';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const cat = params.get('category') || '';
  const all = useMemo(() => searchGames(q), [q]);
  const results = cat ? all.filter((g) => g.category === cat) : all;
  const cats = CATEGORIES.filter((c) => all.some((g) => g.category === c));
  useDocumentTitle(q ? `“${q}”` : 'Search');
  const link = (c) => `/search?q=${encodeURIComponent(q)}${c ? `&category=${c}` : ''}`;

  return (
    <div className="container">
      <header className="page-head search-head">
        {q ? <h1>Results for “{q}”</h1> : <h1>Search</h1>}
        <SearchBox initial={q} size="lg" placeholder="Search thousands of games..." autoFocus={!q} />
      </header>

      {q && all.length > 0 && (
        <div className="filterbar">
          <div className="chips">
            <Link className={`chip ${!cat ? 'on' : ''}`} to={link('')} replace>All <span className="count">{all.length}</span></Link>
            {cats.map((c) => (
              <Link key={c} className={`chip ${cat === c ? 'on' : ''}`} to={link(c)} replace>{c} <span className="count">{all.filter((g) => g.category === c).length}</span></Link>
            ))}
          </div>
        </div>
      )}

      {!q ? (
        <section className="section">
          <SectionHeader title="Popular searches" />
          <GameGrid games={sortGames(games).slice(0, 8)} variant="compact" />
        </section>
      ) : results.length ? (
        <>
          <p className="muted result-count">{results.length} {results.length === 1 ? 'game' : 'games'} found</p>
          <GameGrid games={results} />
        </>
      ) : (
        <>
          <EmptyState title={`No games match “${q}”`} action={<Link to="/explore" className="btn primary">Browse all games</Link>}>
            Check the spelling, try a shorter name, or search by category, e.g. “racing” or “puzzle”.
          </EmptyState>
          <section className="section">
            <SectionHeader title="You might like" />
            <GameGrid games={sortGames(games).slice(0, 4)} variant="compact" />
          </section>
        </>
      )}
    </div>
  );
}

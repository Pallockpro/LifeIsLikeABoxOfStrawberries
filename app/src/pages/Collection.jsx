import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/Sections';
import { ChevronLeft } from '../components/Icons';
import { games, getCollection } from '../data/games';
import { FilterBar, PagedGrid, useFilteredGames } from './Explore';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import NotFound from './NotFound';

export default function Collection() {
  const { key } = useParams();
  const col = getCollection(key);
  const [params, setParams] = useSearchParams();
  const base = useMemo(() => (col ? games.filter(col.filter) : []), [col]);
  const p = useMemo(() => {
    const n = new URLSearchParams(params);
    if (!n.get('sort') && col?.sort) n.set('sort', col.sort);
    return n;
  }, [params, col]);
  const list = useFilteredGames(p, base);
  useDocumentTitle(col?.title);
  if (!col) return <NotFound />;

  return (
    <div className="container">
      <Link to="/explore" className="back-link"><ChevronLeft width={16} height={16} /> Explore</Link>
      <header className="page-head">
        <h1>{col.title}</h1>
        <p className="muted">{col.blurb} {list.length} games.</p>
      </header>
      <FilterBar params={p} setParams={setParams} showCategories={false} />
      {list.length ? <PagedGrid list={list} params={params} setParams={setParams} />
        : <EmptyState title="No games here yet" />}
    </div>
  );
}

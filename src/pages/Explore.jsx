import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, GameGrid, GameRow, Pagination } from '../components/Sections';
import { CATEGORIES, COLLECTIONS, SORTS, games, searchGames, sortGames } from '../data/games';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { SearchIcon, XIcon } from '../components/Icons';

export const PAGE_SIZE = 24;

export function FilterBar({ params, setParams, showCategories = true }) {
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'popular';
  const filter = params.get('filter') || '';
  const update = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setParams(next, { replace: k === 'filter' });
  };
  return (
    <div className="filterbar">
      {showCategories && (
        <div className="chips" role="tablist" aria-label="Categories">
          <button role="tab" aria-selected={!category} className={`chip ${!category ? 'on' : ''}`} onClick={() => update('category', '')}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} role="tab" aria-selected={category === c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => update('category', c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="filter-controls">
        <label className="mini-search">
          <SearchIcon width={15} height={15} />
          <input value={filter} placeholder="Filter by name" aria-label="Filter by name" onChange={(e) => update('filter', e.target.value)} />
          {filter && <button aria-label="Clear filter" onClick={() => update('filter', '')}><XIcon width={14} height={14} /></button>}
        </label>
        <label className="select">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value)}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export function useFilteredGames(params, base) {
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'popular';
  const filter = params.get('filter') || '';
  return useMemo(() => {
    let list = category ? base.filter((g) => g.category === category) : base;
    if (filter.trim()) {
      const hits = searchGames(filter, list);
      list = params.get('sort') ? sortGames(hits, sort) : hits;
    } else list = sortGames(list, sort);
    return list;
  }, [base, category, sort, filter, params]);
}

export function PagedGrid({ list, params, setParams }) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get('page')) || 1));
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const go = (p) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set('page', String(p)); else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0 });
  };
  return (
    <>
      <GameGrid games={slice} />
      <Pagination page={page} pages={pages} onChange={go} />
    </>
  );
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const filtering = Boolean(category || params.get('filter') || params.get('sort'));
  useDocumentTitle(category ? `${category} games` : 'Explore');
  const list = useFilteredGames(params, games);

  return (
    <div className="container">
      <header className="page-head">
        <h1>{category ? `${category} games` : 'Explore'}</h1>
        <p className="muted">{filtering ? `${list.length} ${list.length === 1 ? 'game' : 'games'}` : `Browse all ${games.length} games in the library.`}</p>
      </header>
      <FilterBar params={params} setParams={setParams} />

      {filtering ? (
        list.length ? <PagedGrid list={list} params={params} setParams={setParams} />
          : <EmptyState title="Nothing matches those filters">Try a different category or clear the name filter.</EmptyState>
      ) : (
        COLLECTIONS.map((c) => {
          const items = sortGames(games.filter(c.filter), c.sort).slice(0, 14);
          return <GameRow key={c.key} title={c.title} subtitle={c.blurb} to={`/explore/${c.key}`} games={items} />;
        })
      )}
    </div>
  );
}

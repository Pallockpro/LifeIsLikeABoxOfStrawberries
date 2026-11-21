import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGames } from '../data/games';
import GameThumb from './GameThumb';
import { SearchIcon, XIcon } from './Icons';

export default function SearchBox({ initial = '', size = 'md', placeholder = 'Search games', autoFocus = false, suggest = true, onSubmitted }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const nav = useNavigate();
  const wrap = useRef(null);
  const input = useRef(null);
  const listId = useId();

  useEffect(() => setQ(initial), [initial]);

  const results = useMemo(() => (suggest && q.trim() ? searchGames(q).slice(0, 6) : []), [q, suggest]);

  useEffect(() => {
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const go = (path) => { setOpen(false); setActive(-1); input.current?.blur(); nav(path); onSubmitted?.(); };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(`/game/${results[active].id}`);
    const term = q.trim();
    if (term) go(`/search?q=${encodeURIComponent(term)}`);
  };

  const onKey = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && results.length > 0;

  return (
    <form className={`search search-${size}`} role="search" onSubmit={submit} ref={wrap}>
      <SearchIcon className="search-icon" width={size === 'lg' ? 20 : 17} height={size === 'lg' ? 20 : 17} />
      <input
        ref={input}
        type="search"
        value={q}
        placeholder={placeholder}
        aria-label="Search games"
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {q && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQ(''); input.current?.focus(); }}>
          <XIcon width={15} height={15} />
        </button>
      )}
      {size === 'lg' && <button type="submit" className="btn primary search-submit">Search</button>}
      {showList && (
        <ul className="suggest" id={listId} role="listbox">
          {results.map((g, i) => (
            <li key={g.id} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(`/game/${g.id}`)}>
                <span className="suggest-thumb"><GameThumb game={g} /></span>
                <span className="suggest-text"><strong>{g.title}</strong><small>{g.category}</small></span>
              </button>
            </li>
          ))}
          <li className="suggest-all">
            <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}>
              See all results for “{q.trim()}”
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}

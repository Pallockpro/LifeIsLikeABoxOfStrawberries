import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from './Logo';
import SearchBox from './SearchBox';
import GameThumb from './GameThumb';
import { ClockIcon, DiceIcon, MenuIcon, SettingsIcon, XIcon } from './Icons';
import { useHistory } from '../lib/storage';
import { getGame, randomGame } from '../data/games';

function RecentMenu() {
  const [open, setOpen] = useState(false);
  const { recent } = useHistory();
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const games = recent.map(getGame).filter(Boolean).slice(0, 6);
  return (
    <div className="popover-wrap" ref={ref}>
      <button className="icon-btn" aria-label="Recently played" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ClockIcon />
      </button>
      {open && (
        <div className="popover">
          <div className="popover-head"><strong>Recently played</strong><Link to="/library" className="text-link">Library</Link></div>
          {games.length ? (
            <ul className="mini-list">
              {games.map((g) => (
                <li key={g.id}><Link to={`/game/${g.id}`}><span className="suggest-thumb"><GameThumb game={g} /></span><span className="suggest-text"><strong>{g.title}</strong><small>{g.category}</small></span></Link></li>
              ))}
            </ul>
          ) : <p className="muted small pad">Games you play will show up here.</p>}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const [params] = useSearchParams();
  const currentQ = loc.pathname === '/search' ? params.get('q') || '' : '';
  useEffect(() => setMenu(false), [loc.pathname, loc.search]);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; }, [menu]);
  const navigate = useNavigate();
  const currentGame = loc.pathname.startsWith('/game/') ? loc.pathname.slice(6) : null;
  const playRandom = () => navigate(`/game/${randomGame(currentGame).id}`);

  // "/" jumps to the search box, like most sites
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const box = document.querySelector('.nav-search input');
      if (!box || !box.offsetParent) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="nav">
      <div className="nav-inner container">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/explore">Explore</NavLink>
          <NavLink to="/videos">Videos</NavLink>
          <NavLink to="/library">Library</NavLink>
        </nav>
        <div className="nav-search"><SearchBox initial={currentQ} placeholder="Search games  ( / )" /></div>
        <div className="nav-actions">
          <button className="icon-btn" aria-label="Play a random game" title="Random game" onClick={playRandom}><DiceIcon /></button>
          <RecentMenu />
          <Link to="/settings" className="icon-btn" aria-label="Settings"><SettingsIcon /></Link>
          <button className="icon-btn nav-burger" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {menu ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {menu && (
        <div className="mobile-menu">
          <SearchBox initial={currentQ} placeholder="Search games" onSubmitted={() => setMenu(false)} />
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/explore">Explore</NavLink>
          <NavLink to="/videos">Videos</NavLink>
          <NavLink to="/library">Library</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <button type="button" className="mobile-random" onClick={playRandom}>Random game</button>
        </div>
      )}
    </header>
  );
}

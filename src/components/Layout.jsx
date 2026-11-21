import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { StrawberryMark } from './Logo';
import { CATEGORIES } from '../data/games';

export default function Layout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <>
      <Navbar />
      <main className="page" key={loc.pathname}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <StrawberryMark size={22} />
            <span>Strawberry</span>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/explore">All games</Link>
            {CATEGORIES.slice(0, 5).map((c) => <Link key={c} to={`/explore?category=${c}`}>{c}</Link>)}
            <Link to="/settings">Settings</Link>
          </nav>
          <p className="muted small">Games belong to their respective developers and publishers.</p>
        </div>
      </footer>
    </>
  );
}

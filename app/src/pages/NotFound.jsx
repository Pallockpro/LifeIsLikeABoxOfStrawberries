import { Link } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container notfound">
      <p className="eyebrow">404</p>
      <h1>This page got picked already.</h1>
      <p className="muted">The page you’re looking for doesn’t exist or has moved. Try searching for a game instead.</p>
      <div className="notfound-search"><SearchBox size="lg" placeholder="Search games..." /></div>
      <div className="notfound-actions">
        <Link to="/" className="btn primary">Go home</Link>
        <Link to="/explore" className="btn ghost">Explore games</Link>
      </div>
    </div>
  );
}

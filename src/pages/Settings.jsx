import { useFavorites, useHistory, useTheme } from '../lib/storage';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function Settings() {
  useDocumentTitle('Settings');
  const [theme, setTheme] = useTheme();
  const { history, clear: clearHistory } = useHistory();
  const { favorites, clear: clearFavs } = useFavorites();

  return (
    <div className="container narrow">
      <header className="page-head"><h1>Settings</h1></header>

      <section className="panel">
        <div className="panel-row">
          <div><h3>Appearance</h3><p className="muted small">Choose light, dark, or follow your device.</p></div>
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {['light', 'dark', 'system'].map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-row">
          <div><h3>Play history</h3><p className="muted small">{history.length} plays recorded on this device.</p></div>
          <button className="btn ghost" disabled={!history.length} onClick={clearHistory}>Clear history</button>
        </div>
        <div className="panel-row">
          <div><h3>Favorites</h3><p className="muted small">{favorites.length} saved games.</p></div>
          <button className="btn ghost" disabled={!favorites.length} onClick={clearFavs}>Clear favorites</button>
        </div>
      </section>
    </div>
  );
}

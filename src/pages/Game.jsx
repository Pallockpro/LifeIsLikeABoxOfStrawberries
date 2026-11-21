import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GameThumb from '../components/GameThumb';
import { GameGrid, SectionHeader } from '../components/Sections';
import { FlagIcon, HeartIcon, MaximizeIcon, PlayIcon, RotateIcon, XIcon } from '../components/Icons';
import { getGame, relatedGames } from '../data/games';
import { useFavorites, useHistory, useStored } from '../lib/storage';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import NotFound from './NotFound';

const FALLBACK = { id: '', title: '', src: '', category: 'Casual', tags: [] };
const REPORT_REASONS = ['Game doesn’t load', 'Game is broken or glitchy', 'Wrong title or description', 'Inappropriate content', 'Something else'];

function ReportDialog({ game, onClose }) {
  const [, setReports] = useStored('sb:reports', []);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const submit = (e) => {
    e.preventDefault();
    setReports((r) => [...r, { id: game.id, reason, note, at: Date.now() }]);
    setSent(true);
  };
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <h2>Report {game.title}</h2>
        <button className="icon-btn sm" aria-label="Close" onClick={onClose}><XIcon /></button>
      </div>
      {sent ? (
        <div className="dialog-body">
          <p>Thanks. Your report was saved.</p>
          <div className="dialog-actions"><button className="btn primary" onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <form className="dialog-body" onSubmit={submit}>
          <fieldset className="radio-list">
            <legend className="sr-only">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r}><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}</label>
            ))}
          </fieldset>
          <label className="field">
            <span>Details (optional)</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
          </label>
          <div className="dialog-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Send report</button>
          </div>
        </form>
      )}
    </dialog>
  );
}

function usePlayer(game) {
  const frameWrap = useRef(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const { record } = useHistory();

  useEffect(() => { setStarted(false); setLoading(true); }, [game.id]);

  const start = () => { setStarted(true); record(game.id); };
  const restart = () => { setLoading(true); setNonce((n) => n + 1); };
  const fullscreen = () => {
    const el = frameWrap.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  };
  const src = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${game.src}`;

  return { frameWrap, started, restart, fullscreen, view: (
    <div className="player" ref={frameWrap}>
      {!started ? (
        <div className="player-cover">
          <GameThumb game={game} className="player-bg" />
          <div className="player-cover-inner">
            {game.playable ? (
              <button className="btn primary lg" onClick={start}><PlayIcon width={18} height={18} /> Play {game.title}</button>
            ) : (
              <div className="unavailable">
                <strong>This game isn’t available yet</strong>
                <span>It’s in the catalog, but its game file hasn’t been added to the site.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {loading && <div className="player-loading skeleton"><span className="spinner" /> Loading {game.title}…</div>}
          <iframe
            key={nonce}
            src={src}
            title={game.title}
            allow="fullscreen; autoplay; gamepad; clipboard-write"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </>
      )}
    </div>
  ) };
}

export default function Game() {
  const { id } = useParams();
  const game = getGame(id);
  const { isFavorite, toggle } = useFavorites();
  const [reporting, setReporting] = useState(false);
  useDocumentTitle(game?.title);
  const player = usePlayer(game || FALLBACK);
  if (!game) return <NotFound />;
  const fav = isFavorite(game.id);
  const related = relatedGames(game);

  return (
    <div className="container game-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link><span>/</span>
        <Link to={`/explore?category=${game.category}`}>{game.category}</Link><span>/</span>
        <span aria-current="page">{game.title}</span>
      </nav>

      {player.view}

      <div className="game-bar">
        <div className="game-meta">
          <h1>{game.title}</h1>
          <div className="meta-line">
            <Link className="chip sm" to={`/explore?category=${game.category}`}>{game.category}</Link>
            {game.tags.slice(0, 3).map((t) => <Link key={t} className="tag" to={`/search?q=${encodeURIComponent(t)}`}>#{t}</Link>)}
          </div>
        </div>
        <div className="game-tools">
          <button className={`btn ghost ${fav ? 'is-fav' : ''}`} onClick={() => toggle(game.id)} aria-pressed={fav}>
            <HeartIcon fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Favorited' : 'Favorite'}
          </button>
          <button className="btn ghost" onClick={player.restart} disabled={!player.started}><RotateIcon /> Restart</button>
          <button className="btn ghost" onClick={player.fullscreen} disabled={!player.started}><MaximizeIcon /> Fullscreen</button>
          <button className="btn ghost subtle" onClick={() => setReporting(true)}><FlagIcon /> Report</button>
        </div>
      </div>

      <section className="game-about">
        <h2 className="sr-only">About</h2>
        <p>{game.description}</p>
        <dl className="facts">
          <div><dt>Category</dt><dd>{game.category}</dd></div>
          <div><dt>Added</dt><dd>{new Date(game.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
          <div><dt>Controls</dt><dd>Keyboard / mouse</dd></div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="section">
          <SectionHeader title="More like this" to={`/explore?category=${game.category}`} />
          <GameGrid games={related} variant="compact" />
        </section>
      )}

      {reporting && <ReportDialog game={game} onClose={() => setReporting(false)} />}
    </div>
  );
}

import library from './library.json';
import originals from './originals.json';
import installed from './installed.json';

/**
 * Central game database.
 * To add a game: add an entry to library.json (or originals.json) and drop the
 * game file into public/games/<id>.html. Nothing else needs to change.
 */
const installedSet = new Set(installed);

const merged = new Map();
for (const g of [...library, ...originals]) merged.set(g.id, g);

// Only list games whose file is actually on the site
export const games = [...merged.values()]
  .filter((g) => installedSet.has(g.id))
  .map((g) => ({ ...g, playable: true }));

const byId = new Map(games.map((g) => [g.id, g]));
export const getGame = (id) => byId.get(id);

export function randomGame(excludeId) {
  const pool = excludeId ? games.filter((g) => g.id !== excludeId) : games;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const CATEGORIES = [
  'Action', 'Adventure', 'Arcade', 'Puzzle', 'Racing',
  'Sports', 'Strategy', 'Multiplayer', 'Simulation', 'Casual',
];

export const COLLECTIONS = [
  { key: 'trending', title: 'Trending games', blurb: 'What people are playing most right now.', filter: () => true, sort: 'popular' },
  { key: 'new', title: 'Recently added', blurb: 'The newest additions to Strawberry.', filter: () => true, sort: 'newest' },
  { key: 'action-adventure', title: 'Action & Adventure', blurb: 'Platformers, fighters and adventures.', filter: (g) => ['Action', 'Adventure'].includes(g.category) },
  { key: 'puzzle', title: 'Puzzle & Brain Games', blurb: 'Logic, strategy and things to figure out.', filter: (g) => ['Puzzle', 'Strategy'].includes(g.category) },
  { key: 'racing-sports', title: 'Racing & Sports', blurb: 'Driving, ball games and competition.', filter: (g) => ['Racing', 'Sports'].includes(g.category) },
  { key: 'arcade', title: 'Arcade Classics', blurb: 'Quick runs and high scores.', filter: (g) => g.category === 'Arcade' },
  { key: 'multiplayer', title: 'Multiplayer', blurb: 'Play against friends or strangers.', filter: (g) => g.category === 'Multiplayer' },
  { key: 'casual', title: 'Casual Games', blurb: 'Idle, relaxing and easy to pick up.', filter: (g) => ['Casual', 'Simulation'].includes(g.category) },
];
export const getCollection = (key) => COLLECTIONS.find((c) => c.key === key);

export const SORTS = {
  popular: { label: 'Most popular', fn: (a, b) => b.popularity - a.popularity },
  newest: { label: 'Newest', fn: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  az: { label: 'A – Z', fn: (a, b) => a.title.localeCompare(b.title) },
  za: { label: 'Z – A', fn: (a, b) => b.title.localeCompare(a.title) },
};

export function sortGames(list, sort = 'popular') {
  return [...list].sort((SORTS[sort] || SORTS.popular).fn);
}

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const squash = (s) => norm(s).replace(/[^a-z0-9]/g, '');

/** Partial, punctuation-insensitive search over title, tags and category. */
export function searchGames(query, list = games) {
  const q = norm(query.trim());
  if (!q) return [];
  const qs = squash(q);
  const words = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const g of list) {
    const title = norm(g.title);
    const st = squash(g.title);
    const hay = `${title} ${g.tags.join(' ')} ${g.category.toLowerCase()}`;
    let score = 0;
    if (st === qs) score = 100;
    else if (st.startsWith(qs)) score = 80;
    else if (title.split(/[\s:.'-]+/).some((w) => w.startsWith(q))) score = 65;
    else if (qs && st.includes(qs)) score = 50;
    else if (words.every((w) => hay.includes(w))) score = 30;
    else if (words.every((w) => squash(hay).includes(squash(w)))) score = 20;
    if (score) scored.push([score + g.popularity / 1000, g]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, g]) => g);
}

export function relatedGames(game, n = 6) {
  return sortGames(games.filter((g) => g.id !== game.id && g.category === game.category))
    .concat(sortGames(games.filter((g) => g.id !== game.id && g.category !== game.category && g.tags.some((t) => game.tags.includes(t)))))
    .slice(0, n);
}

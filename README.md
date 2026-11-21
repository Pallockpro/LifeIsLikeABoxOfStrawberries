# Strawberry

A browser game platform built with React, Vite and React Router.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # builds and copies the site to the repo root for GitHub Pages
```

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Home: welcome, search, recommendations, popular, recently added, categories |
| `/explore` | The full library in sections, with category filters, sorting and a name filter |
| `/explore/:collection` | "View all" pages (trending, new, action-adventure, puzzle, racing-sports, arcade, multiplayer, casual) with pagination |
| `/search?q=…` | Search results (partial and punctuation-insensitive: `paperio` finds Paper.io) |
| `/game/:id` | Player with fullscreen, restart, favorite, report and related games |
| `/library` | Favorites, recently played and history (stored in localStorage) |
| `/settings` | Light / dark / system theme, clear history and favorites |

## Adding games

Source code is in `app/`. The files at the repo root (`index.html`, `assets/`, `games/`, `404.html`) are the built site that GitHub Pages serves, so run `npm run build` and commit after changing anything.

Every game lives in one place: `app/src/data/library.json` (catalog) and `app/src/data/originals.json` (games made for Strawberry).

```json
{
  "id": "my-game",
  "title": "My Game",
  "description": "One or two sentences.",
  "category": "Arcade",
  "tags": ["platformer"],
  "addedAt": "2026-11-21",
  "popularity": 500,
  "src": "/games/my-game.html"
}
```

Put the game file at `app/public/games/<id>.html`. On `npm run dev` / `npm run build`,
`scripts/sync-games.mjs` detects which files exist. Games whose file is present
get a Play button; the rest stay listed with a "not available yet" message.

Categories: Action, Adventure, Arcade, Puzzle, Racing, Sports, Strategy, Multiplayer, Simulation, Casual.

Only add game files you have the rights to host.

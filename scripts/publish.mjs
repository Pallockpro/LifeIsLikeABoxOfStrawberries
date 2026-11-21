// Copies the built site from dist/ to the repo root for GitHub Pages.
import { cpSync, rmSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
for (const p of ['assets', 'games', 'index.html', '404.html', 'favicon.svg']) rmSync(new URL(p, root), { recursive: true, force: true });
for (const f of readdirSync(new URL('dist/', root))) cpSync(new URL(`dist/${f}`, root), new URL(f, root), { recursive: true });
writeFileSync(new URL('.nojekyll', root), '');
console.log('[publish] copied dist/ to repo root');

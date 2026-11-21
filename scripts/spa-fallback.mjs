// Copies index.html to 404.html so static hosts (e.g. GitHub Pages) serve the app on deep links.
import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));

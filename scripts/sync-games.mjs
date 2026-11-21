// Scans public/games for installed game files and writes src/data/installed.json.
// A game in the library is playable when public/games/<id>.html exists.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';

const dir = new URL('../app/public/games/', import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.html')) : [];
const ids = files.map((f) => f.replace(/\.html$/, '')).sort();
writeFileSync(new URL('../app/src/data/installed.json', import.meta.url), JSON.stringify(ids, null, 2) + '\n');
console.log(`[sync-games] ${ids.length} installed game file(s)`);

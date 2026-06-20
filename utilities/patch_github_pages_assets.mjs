import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const wwwDir = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '../mobile/www');
const prefix = '/cattitude/';

function patchHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(
    /\b(src|href)="(?!https?:|\/cattitude\/|\/\/|#|data:)([^"]+)"/g,
    `$1="${prefix}$2"`,
  );
  fs.writeFileSync(filePath, html);
}

for (const name of ['index.html', '404.html']) {
  const filePath = path.join(wwwDir, name);
  if (fs.existsSync(filePath)) {
    patchHtml(filePath);
  }
}

fs.writeFileSync(path.join(wwwDir, '.nojekyll'), '');
console.log(`Patched GitHub Pages assets in ${wwwDir}`);

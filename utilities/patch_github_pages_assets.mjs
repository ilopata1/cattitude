import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const wwwDir = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '../mobile/www');
const prefix = '/cattitude/';
/** Enables GitHub Pages HTTPS for a custom domain (DNS CNAME → *.github.io). */
const customDomain = (process.env.PAGES_CUSTOM_DOMAIN || '').trim();

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

if (customDomain) {
  fs.writeFileSync(path.join(wwwDir, 'CNAME'), `${customDomain}\n`);
  console.log(`Wrote CNAME → ${customDomain}`);
}

console.log(`Patched GitHub Pages assets in ${wwwDir}`);

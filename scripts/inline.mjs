import fs from 'fs';
import path from 'path';
const html = fs.readFileSync('dist/index.html', 'utf8');
const m = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!m) throw new Error('script tag not found');
const js = fs.readFileSync(path.join('dist', m[1]), 'utf8').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync('surf-bhop.html', html.replace(m[0], () => `<script type="module">${js}</script>`));
console.log('surf-bhop.html', (fs.statSync('surf-bhop.html').size / 1024).toFixed(0) + ' kB');

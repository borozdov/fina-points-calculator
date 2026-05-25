import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'www');

const entries = [
    '404.html',
    'CNAME',
    'assets/img',
    'css',
    'data',
    'index.html',
    'js',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'sw.js'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const entry of entries) {
    const destination = path.join(webDir, entry);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, entry), destination, { recursive: true });
}

await rm(path.join(webDir, 'js/lib/qrcode.min.js'), { force: true });

console.log(`Prepared Capacitor web assets in ${webDir}`);

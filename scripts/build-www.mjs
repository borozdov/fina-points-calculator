import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'www');

const entries = [
    '404.html',
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

// Сначала проверяем, потом удаляем. www/ сносится целиком, поэтому падение на середине
// копирования оставляло бы огрызок сборки — а Capacitor упаковал бы его молча.
const missing = [];
for (const entry of entries) {
    try {
        await access(path.join(root, entry));
    } catch {
        missing.push(entry);
    }
}

if (missing.length) {
    console.error(`Missing sources, build aborted (www/ left untouched):\n${missing.map(e => `  ${e}`).join('\n')}`);
    process.exit(1);
}

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const entry of entries) {
    const destination = path.join(webDir, entry);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, entry), destination, { recursive: true });
}

await rm(path.join(webDir, 'js/lib/qrcode.min.js'), { force: true });

console.log(`Prepared Capacitor web assets in ${webDir}`);

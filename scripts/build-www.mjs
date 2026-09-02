import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'www');

const entries = [
    // Только img и fonts: без шрифтов предкэш service worker падал бы на
    // отсутствующем файле. assets/screenshots и assets/splash — витрина установки
    // PWA и стартовые экраны iOS, внутри Android-пакета это мёртвый груз.
    'assets/img',
    'assets/fonts',
    'css',
    'index.html',
    'js',
    'manifest.json',
    // qr нужен и в нативной сборке: кнопка QR в шапке ведёт на /qr/, а без
    // копирования она упиралась в 404 прямо внутри приложения
    'qr',
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

console.log(`Prepared Capacitor web assets in ${webDir}`);

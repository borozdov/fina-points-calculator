import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';

import { BT } from '../js/data/constants.js';
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
    'favicon.ico',
    'index.html',
    'js',
    'manifest.json',
    // qr нужен и в нативной сборке: кнопка QR в шапке ведёт на /qr/, а без
    // копирования она упиралась в 404 прямо внутри приложения
    'qr',
    'robots.txt',
    'sitemap.xml',
    'sw.js',
    // Статические страницы, собранные scripts/build-pages.mjs
    'bazovye-vremena',
    'ochki-i-razryady',
    'tablica-ochkov'
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

/*
  Виджет на домашнем экране читает базовые времена из ассетов пакета:
  FinaWidgetProvider.java → getAssets().open("public/data/fina_base_times.json").
  Раньше этот файл лежал в репозитории отдельной копией BT и был удалён; виджет с тех пор
  работает только на несинхронизированном снимке в android/, и первый же `cap sync` его
  затрёт. Отдаём JSON здесь, из тех же данных, что и веб: две копии одних чисел разъезжаются,
  одна — нет. Ошибка при этом молчаливая: getBaseTime вернул бы 0, список событий стал бы
  пустым, и виджет показал бы нули без единого сообщения.
*/
await mkdir(path.join(webDir, 'data'), { recursive: true });
await writeFile(path.join(webDir, 'data/fina_base_times.json'), `${JSON.stringify(BT, null, 4)}\n`);

console.log(`Prepared Capacitor web assets in ${webDir}`);

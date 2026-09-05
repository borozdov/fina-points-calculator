/*
  Статические страницы из тех же данных, которыми считает калькулятор.

  Приложение это один экран, и поиску оно показывает подписи контролов: ни базовых времён,
  ни нормативов, ни одной цифры в HTML. Данные при этом в репозитории есть — 70 базовых
  времён и 630 нормативов. Этот скрипт печатает их страницами.

  Шаблонизатора в проекте нет и не заводится: страницы простые, а лишняя зависимость в
  сборке, которой раньше не было вовсе, дороже пары шаблонных строк здесь.

  Единственный источник правды остаётся в js/data/*.js. Всё, что ниже, только печатает.
*/
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_TIMES, BT, RANKS, RU, STD_MAP, STYLE_ORDER, STYLE_RU } from '../js/data/constants.js';
import { STANDARDS } from '../js/data/standards.js';
import { Calculator } from '../js/core/Calculator.js';
import { fmt } from '../js/helpers/utils.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://fina.borozdov.ru';
const RANK_SITE = 'https://razryad.borozdov.ru';

/** Каталоги, которые скрипт полностью владеет и пересоздаёт. Ничего другого он не трогает. */
const OWNED = ['bazovye-vremena', 'ochki-i-razryady', 'tablica-ochkov'];

const POOLS = [
  { key: 'SCM', slug: 'scm', metres: 25, label: 'Бассейн 25 м' },
  { key: 'LCM', slug: 'lcm', metres: 50, label: 'Бассейн 50 м' },
];

const GENDERS = [
  { key: 'Men', label: 'Мужчины' },
  { key: 'Women', label: 'Женщины' },
];

/** Очки, на которые печатаются целевые времена. Ниже 400 таблица никому не нужна. */
const TARGETS = [400, 500, 600, 700, 800, 900, 1000];

const esc = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** «100m Freestyle» → «100-vol-stil»: адрес читается и не зависит от языка данных. */
const STROKE_SLUG = {
  Freestyle: 'volnyy-stil',
  Backstroke: 'na-spine',
  Breaststroke: 'brass',
  Butterfly: 'batterflyay',
  Medley: 'kompleks',
};

const STROKE_FULL = {
  Freestyle: 'вольный стиль',
  Backstroke: 'на спине',
  Breaststroke: 'брасс',
  Butterfly: 'баттерфляй',
  Medley: 'комплексное плавание',
};

/** Событие датасета: ключ «100m Freestyle» плюс всё, что нужно странице. */
const events = (poolKey) => {
  const seen = Object.keys(BT[poolKey].Men);
  return seen.map((key) => {
    const [distancePart, stroke] = [key.slice(0, key.indexOf('m ')), key.slice(key.indexOf('m ') + 2)];
    const distance = Number(distancePart);
    return {
      key,
      stroke,
      distance,
      slug: `${distance}-${STROKE_SLUG[stroke]}`,
      short: RU[key],
      full: `${STROKE_FULL[stroke]} ${distance} м`,
    };
  });
};

/** Общая обвязка страницы: та же шапка, тот же лик, тот же счётчик, что у приложения. */
const page = ({ path, title, description, heading, crumbs, body }) => {
  const url = `${ORIGIN}${path}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(({ name, href }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      ...(href ? { item: `${ORIGIN}${href}` } : {}),
    })),
  };

  return `<!DOCTYPE html>
<html lang="ru" data-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <base href="/">

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="index, follow">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:site_name" content="FINA Points Borozdov">

    <link rel="icon" href="/favicon.ico" sizes="32x32">
    <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
    <meta name="theme-color" id="meta-theme-color" content="#0d0d0d">
    <meta name="color-scheme" content="dark light">
    <meta name="format-detection" content="telephone=no">

    <script>
        (function () {
            try {
                var stored = localStorage.getItem('fina_lik');
                var theme = (stored === 'dark' || stored === 'light')
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.setAttribute('data-theme', theme);
                var mt = document.getElementById('meta-theme-color');
                if (mt) mt.content = theme === 'light' ? '#fafafa' : '#0d0d0d';
            } catch (e) { }
        })();
    </script>
    <link rel="stylesheet" href="css/pages.css">

    <script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 4)}
    </script>
</head>

<body>
    <div class="wrap">
        <header class="head">
            <a class="logo" href="/">
                <span class="logo-top">FINA POINTS</span>
                <span class="logo-bottom">BY BOROZDOV</span>
            </a>
            <a class="calc-link" href="/">Калькулятор</a>
        </header>

        <nav class="crumbs" aria-label="Хлебные крошки">
            ${crumbs
              .map(({ name, href }, index) =>
                index === crumbs.length - 1
                  ? `<span aria-current="page">${esc(name)}</span>`
                  : `<a href="${href}">${esc(name)}</a><span class="sep" aria-hidden="true">/</span>`,
              )
              .join('\n            ')}
        </nav>

        <h1>${esc(heading)}</h1>

${body}

        <footer class="foot">
            <span>Сделал <b>Nikita Borozdov</b>, мастер спорта по плаванию</span>
            <a href="https://borozdov.ru/?utm_source=fina.borozdov.ru&amp;utm_medium=referral&amp;utm_campaign=pages" rel="author">borozdov.ru</a>
        </footer>
    </div>
</body>

</html>
`;
};

/** Строка «действует с … по …», одна на обе страницы, где она нужна. */
const validity = (poolKey) => {
  const { edition, from, to } = BASE_TIMES[poolKey];
  const ru = (iso) => iso.split('-').reverse().join('.');
  return `${edition}, действует с ${ru(from)} по ${ru(to)}`;
};

const table = (headers, rows) => `        <div class="scroll">
            <table>
                <thead>
                    <tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr>
                </thead>
                <tbody>
${rows.map((r) => `                    <tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('\n')}
                </tbody>
            </table>
        </div>`;

// ─── Страница 1: базовые времена ────────────────────────────────────────────────

const baseTimesPage = () => {
  const sections = POOLS.map((pool) => {
    const rows = events(pool.key).map((event) => [
      esc(event.full),
      `<span class="num">${fmt(BT[pool.key].Men[event.key])}</span>`,
      `<span class="num">${fmt(BT[pool.key].Women[event.key])}</span>`,
    ]);
    return `        <h2>${esc(pool.label)}</h2>
        <p class="note">${esc(validity(pool.key))}.</p>
${table(['Дистанция', 'Мужчины', 'Женщины'], rows)}`;
  }).join('\n\n');

  return page({
    path: '/bazovye-vremena/',
    title: 'Базовые времена FINA 2026 — таблица для бассейнов 25 и 50 м',
    description:
      'Базовые времена World Aquatics (FINA) редакции 2026: все 70 дистанций для бассейнов ' +
      '25 и 50 м, мужчины и женщины. Из этих секунд считаются очки, и ровно они дают 1000.',
    heading: 'Базовые времена FINA 2026',
    crumbs: [
      { name: 'Калькулятор очков FINA', href: '/' },
      { name: 'Базовые времена' },
    ],
    body: `        <p class="lead">
            Базовое время — та секунда, из которой считается ровно 1000 очков. Это мировой рекорд,
            утверждённый на дату начала действия таблицы, поэтому у каждой редакции свой срок,
            и у двух бассейнов он разный: 25 м обновляется 1 сентября, 50 м — 1 января.
        </p>
        <p class="lead">
            Система после переименования федерации в 2023 году официально называется
            World Aquatics Points; в России её по-прежнему ищут как «очки FINA».
            <a href="${BASE_TIMES.source}" rel="nofollow noopener">Официальный PDF</a>.
        </p>

${sections}

        <h2>Что с ними делать</h2>
        <p>
            Формула <code>P = 1000 · (B / T)³</code>: подставьте своё время вместо <code>T</code> и
            базовое вместо <code>B</code>. Считать руками не обязательно —
            <a href="/">калькулятор</a> сделает это в обе стороны, а
            <a href="/tablica-ochkov/">таблицы целевых времён</a> показывают, что нужно проплыть
            на круглое число очков.
        </p>`,
  });
};

// ─── Страница 2: очки и разряды ─────────────────────────────────────────────────

/** Очки, которые даёт норматив разряда на этом событии. Разряд у ЕВСК свой на каждый пол. */
const rankPoints = (poolKey, gender, event) => {
  const key = `${event.distance}, ${STD_MAP[event.stroke]}`;
  const pool = poolKey === 'SCM' ? '25m' : '50m';
  const table = STANDARDS[gender === 'Men' ? 'men' : 'women']?.[pool]?.[key];
  if (!table) return null;
  const base = BT[poolKey][gender][event.key];
  return RANKS.map((rank) => {
    const seconds = parseStandard(table[rank]);
    return seconds === null ? null : Math.floor(Calculator.calcPts(base, seconds));
  });
};

/** «01:02.30» и «58.05» из датасета нормативов — в секунды. */
const parseStandard = (printed) => {
  if (!printed) return null;
  const parts = String(printed).split(':');
  return parts.length === 2
    ? Number(parts[0]) * 60 + Number(parts[1])
    : Number(parts[0]);
};

const pointsAndRanksPage = () => {
  const sections = POOLS.flatMap((pool) =>
    GENDERS.map((gender) => {
      const rows = events(pool.key).flatMap((event) => {
        const points = rankPoints(pool.key, gender.key, event);
        return points === null ? [] : [[esc(event.full), ...points.map((p) => `<span class="num">${p}</span>`)]];
      });
      if (rows.length === 0) return [];
      return `        <h2>${esc(pool.label)}, ${esc(gender.label.toLowerCase())}</h2>
${table(['Дистанция', ...RANKS], rows)}`;
    }),
  ).join('\n\n');

  return page({
    path: '/ochki-i-razryady/',
    title: 'Сколько очков FINA нужно на разряд — таблица по всем дистанциям',
    description:
      'Сколько очков FINA даёт каждый разряд ЕВСК: от III юношеского до МСМК, по всем ' +
      'дистанциям обоих бассейнов, мужчины и женщины. Посчитано из нормативов приказа № 1092.',
    heading: 'Сколько очков FINA нужно на разряд',
    crumbs: [
      { name: 'Калькулятор очков FINA', href: '/' },
      { name: 'Очки и разряды' },
    ],
    body: `        <p class="lead">
            Калькулятор выдаёт число, и следом возникает вопрос: много это или мало. Здесь ответ
            в привычной шкале — сколько очков FINA стоит каждая ступень ЕВСК на каждой дистанции.
            Очки посчитаны из нормативов приказа Минспорта № 1092 по базовым временам ${esc(BASE_TIMES.LCM.edition)}
            и ${esc(BASE_TIMES.SCM.edition)}, той же формулой, что и в калькуляторе.
        </p>
        <p class="lead">
            Сами нормативы в секундах, страницы отдельных дистанций и калькулятор разряда живут на
            <a href="${RANK_SITE}/">razryad.borozdov.ru</a>. Здесь только перевод в очки.
        </p>

${sections}

        <h2>Оговорка</h2>
        <p>
            Очки — международная шкала сравнения, разряд — статус, который присваивают по протоколу
            соревнования. Совпадение времени с нормативом само по себе разряда не даёт, и таблица
            выше не заменяет протокол.
        </p>`,
  });
};

// ─── Страницы 3: целевые времена по событиям ────────────────────────────────────

const targetPage = (pool, event) => {
  const base = { Men: BT[pool.key].Men[event.key], Women: BT[pool.key].Women[event.key] };
  /* Оба пола в одной таблице, а не двумя страницами: две страницы на событие были бы
     половинами одной, а половина данных на странице это ровно тот околодубль, который
     поисковики называют малополезным контентом. */
  const rows = TARGETS.map((points) => [
    `<span class="num">${points}</span>`,
    `<span class="num">${fmt(Calculator.calcTime(base.Men, points))}</span>`,
    `<span class="num">${fmt(Calculator.calcTime(base.Women, points))}</span>`,
  ]);
  const heading = `${event.full}, ${pool.label.toLowerCase()}`;
  const path = `/tablica-ochkov/${pool.slug}/${event.slug}/`;

  return {
    path,
    html: page({
      path,
      title: `Очки FINA: ${heading}`,
      description:
        `Какое время нужно на 400–1000 очков FINA: ${heading}, мужчины и женщины. ` +
        `Базовые времена ${fmt(base.Men)} и ${fmt(base.Women)}, редакция ${BASE_TIMES[pool.key].edition}.`,
      heading: `Очки FINA: ${heading}`,
      crumbs: [
        { name: 'Калькулятор очков FINA', href: '/' },
        { name: 'Таблицы очков', href: '/tablica-ochkov/' },
        { name: heading },
      ],
      body: `        <p class="lead">
            Ровно 1000 очков даёт базовое время: <b class="num">${fmt(base.Men)}</b> у мужчин и
            <b class="num">${fmt(base.Women)}</b> у женщин. ${esc(validity(pool.key))}.
        </p>

${table(['Очки', 'Мужчины', 'Женщины'], rows)}

        <p class="note">
            Промежуточные значения считает <a href="/">калькулятор</a>: он работает в обе стороны и
            подписывает разряд, который время закрывает. Сколько очков стоит каждый разряд, показывает
            <a href="/ochki-i-razryady/">таблица очков и разрядов</a>.
        </p>`,
    }),
  };
};

const hubPage = (pages) => {
  const sections = POOLS.map((pool) => {
    const links = events(pool.key)
      .map(
        (event) =>
          `                <li><a href="/tablica-ochkov/${pool.slug}/${event.slug}/">${esc(event.full)}</a></li>`,
      )
      .join('\n');
    return `        <h2>${esc(pool.label)}</h2>
            <ul class="links">
${links}
            </ul>`;
  }).join('\n\n');

  return page({
    path: '/tablica-ochkov/',
    title: 'Таблицы очков FINA по дистанциям — какое время на 500, 700, 900 очков',
    description:
      `Целевые времена по очкам FINA для всех ${pages} дистанций обоих бассейнов: ` +
      'сколько нужно проплыть на 400, 500, 600, 700, 800, 900 и 1000 очков.',
    heading: 'Таблицы очков FINA по дистанциям',
    crumbs: [
      { name: 'Калькулятор очков FINA', href: '/' },
      { name: 'Таблицы очков' },
    ],
    body: `        <p class="lead">
            На каждой странице — какое время даёт круглое число очков на этой дистанции, от 400 до
            1000, у мужчин и у женщин. Полные официальные таблицы это стостраничные PDF; здесь то же
            самое, но по одной дистанции и с телефона.
        </p>

${sections}`,
  });
};

// ─── Стили страниц ──────────────────────────────────────────────────────────────

/*
  Токены лика не дублируются, а вырезаются из style.css: у страниц и приложения обязан
  быть один источник цвета, иначе они разъедутся при первой же правке темы.
*/
const buildStylesheet = async () => {
  const app = await readFile(join(ROOT, 'css/style.css'), 'utf8');
  const take = (selector) => {
    const start = app.indexOf(selector);
    if (start === -1) throw new Error(`В css/style.css нет блока ${selector}`);
    return app.slice(start, app.indexOf('}', start) + 1);
  };
  const fonts = [...app.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]).join('\n');

  return `/*
  Стили статических страниц. Собирается scripts/build-pages.mjs — правьте генератор, не этот файл.
  Токены лика и @font-face вырезаны из css/style.css, чтобы цвет и шрифт были одни на весь сайт.
*/
${take(':root {')}

${take('[data-theme="dark"] {')}

${take('[data-theme="light"] {')}

${fonts}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
    margin: 0;
    background: var(--canvas);
    color: var(--text);
    font-family: var(--font);
    font-size: 0.875rem;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}

.wrap {
    max-width: 480px;
    margin: 0 auto;
    padding: max(10px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 40px max(14px, env(safe-area-inset-left));
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
}

.logo { display: flex; flex-direction: column; line-height: 1; text-decoration: none; }
.logo-top { font-size: 1.05rem; font-weight: 600; text-transform: uppercase; letter-spacing: -0.02em; color: var(--text); }
.logo-bottom { margin-top: 3px; font-size: 0.55rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--slate); }

.calc-link {
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.75rem;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.calc-link:hover { border-color: var(--border-strong); }

.crumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 14px 0 10px;
    color: var(--slate);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
}

.crumbs a { color: var(--slate); text-decoration: none; }
.crumbs a:hover { color: var(--text); }
.crumbs .sep { color: var(--border); }

h1 { margin: 0 0 12px; font-size: 1.125rem; font-weight: 600; line-height: 1.2; text-transform: uppercase; letter-spacing: -0.02em; }
h2 { margin: 26px 0 8px; font-size: 0.62rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--slate); }

p { margin: 0 0 10px; }
.lead { color: var(--text); }
.note { color: var(--slate); font-size: 0.8125rem; }

code { font-family: var(--mono); font-size: 0.9em; white-space: nowrap; }

a { color: var(--text); text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--text); }

/* Таблица шире экрана прокручивается внутри себя, а не тащит за собой страницу. */
.scroll { overflow-x: auto; margin: 0 0 6px; }

table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
th, td { padding: 7px 10px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
thead th { color: var(--slate); font-size: 0.62rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; }
tbody th { font-weight: 400; }
/* Заголовок встаёт над своей колонкой: числа прижаты вправо, значит и подпись тоже. */
th:not(:first-child), td { text-align: right; }

/* Любое число моноширинное и с табличными цифрами: колонки обязаны стоять столбиком. */
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.links { margin: 0; padding: 0; list-style: none; columns: 2; }
.links li { margin-bottom: 5px; break-inside: avoid; }

.foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    color: var(--slate);
    font-size: 0.7rem;
}
`;
};

// ─── Сборка ─────────────────────────────────────────────────────────────────────

const write = async (path, html) => {
  const file = join(ROOT, path.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  return path;
};

/*
  sitemap.xml и предкэш service worker пишутся здесь же, из того же списка страниц.
  Руками их не ведут: sitemap уже застыл на одном адресе и дате первого коммита, а
  isCacheable() в sw.js это жёсткий белый список — файл, не попавший в него, не кэшируется
  вовсе, и оффлайн ломается молча.
*/
const writeSitemap = async (paths) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ['/', ...paths]
    .map((path) => {
      const priority = path === '/' ? '1.0' : path.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6';
      return `    <url>
        <loc>${ORIGIN}${path}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>${priority}</priority>
    </url>`;
    })
    .join('\n');

  await writeFile(
    join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
  );
};

/** Хабы и сам стиль страниц кладём в предкэш, 35 таблиц — нет: оболочка это не весь сайт. */
const updateServiceWorker = async () => {
  const file = join(ROOT, 'sw.js');
  const source = await readFile(file, 'utf8');
  const additions = ['/css/pages.css', '/bazovye-vremena/', '/ochki-i-razryady/', '/tablica-ochkov/'];
  const missing = additions.filter((path) => !source.includes(`'${path}'`));
  if (missing.length === 0) return;
  const anchor = "    '/qr/',";
  if (!source.includes(anchor)) throw new Error('В sw.js не найден якорь предкэша');
  const inserted = source.replace(anchor, [anchor, ...missing.map((p) => `    '${p}',`)].join('\n'));
  await writeFile(file, inserted);
  console.log(`В предкэш sw.js добавлено: ${missing.join(', ')}`);
};

const run = async () => {
  for (const dir of OWNED) await rm(join(ROOT, dir), { recursive: true, force: true });

  const written = [];
  written.push(await write('/bazovye-vremena/', baseTimesPage()));
  written.push(await write('/ochki-i-razryady/', pointsAndRanksPage()));

  const targets = POOLS.flatMap((pool) => events(pool.key).map((event) => targetPage(pool, event)));
  for (const { path, html } of targets) written.push(await write(path, html));

  written.push(await write('/tablica-ochkov/', hubPage(targets.length)));

  await writeFile(join(ROOT, 'css/pages.css'), await buildStylesheet());
  await writeSitemap(written);
  await updateServiceWorker();

  console.log(`Собрано страниц: ${written.length}, плюс css/pages.css и sitemap.xml`);
  return written;
};

const written = await run();
export { written };

/*
  Сторож за сроком действия базовых времён.

  Очки считаются из таблицы World Aquatics, у которой есть период действия, и у двух
  бассейнов он разный: 25 м обновляется 1 сентября, 50 м — 1 января. Смену 01.09.2026
  никто не заметил, и приложение считало 25 м по прошлой редакции. Проверять сами числа
  скриптом бессмысленно — сверять их можно только с официальным PDF, глазами. А вот дату
  машина стережёт даром, и именно дата была тем, что проглядели.

  Запускается из npm test и перед сборкой. Ненулевой код возврата, когда таблица истекла.
*/
import { readFile } from 'node:fs/promises';

const SOURCE = 'js/data/constants.js';

/** Читаем литерал BASE_TIMES из модуля данных, не импортируя его: скрипт не браузер. */
const readEditions = async () => {
  const text = await readFile(new URL(`../${SOURCE}`, import.meta.url), 'utf8');
  const editions = {};
  for (const pool of ['SCM', 'LCM']) {
    const match = new RegExp(
      `${pool}:\\s*\\{\\s*edition:\\s*'([^']+)',\\s*from:\\s*'([\\d-]+)',\\s*to:\\s*'([\\d-]+)'`,
    ).exec(text);
    if (!match) throw new Error(`В ${SOURCE} нет периода действия для ${pool}`);
    editions[pool] = { edition: match[1], from: match[2], to: match[3] };
  }
  return editions;
};

const today = new Date().toISOString().slice(0, 10);
const editions = await readEditions();

let expired = false;
for (const [pool, { edition, from, to }] of Object.entries(editions)) {
  const live = from <= today && today <= to;
  console.log(`${live ? '  ok' : 'СТОП'}  ${pool}: ${edition}, действует ${from} — ${to}`);
  if (!live) expired = true;
}

if (expired) {
  console.error(
    '\nТаблица базовых времён вне периода действия. Возьмите свежую редакцию:\n' +
      '  https://www.worldaquatics.com/swimming/points\n' +
      `и обновите BT и BASE_TIMES в ${SOURCE}. Очки, посчитанные до этого, неверны.`,
  );
  process.exit(1);
}

console.log(`\nПроверено на ${today}.`);

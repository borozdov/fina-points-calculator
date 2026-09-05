/*
  Базовые времена World Aquatics — то, из чего считаются очки. Система называлась FINA
  Points до переименования федерации в 2023 году; здесь и в интерфейсе сохранено старое
  имя, потому что искать продолжают именно его.

  Источник: World Aquatics Points — Base Times SCM and LCM 2026, официальный PDF
  https://resources.fina.org/fina/document/2026/09/05/9b48fb98-233c-4ce9-b67b-bc6163319bbd/Points-Base-times-SCM-and-LCM-2026_09.2026.pdf
  Сверено построчно 05.09.2026, все 70 значений.

  Базовое время по определению есть мировой рекорд, утверждённый на дату начала периода
  действия таблицы. Поэтому отдельного датасета рекордов у приложения нет и быть не должно:
  он был бы копией этой таблицы, расходящейся с ней по мере устаревания.

  Периоды действия у двух бассейнов разные, и это ловушка: 25 м обновляется 1 сентября,
  50 м — 1 января. scripts/check-basetimes.mjs следит за датами, потому что смену
  01.09.2026 никто не заметил и приложение четыре дня считало 25 м по старой таблице.
*/
export const BASE_TIMES = {
    source: 'https://resources.fina.org/fina/document/2026/09/05/9b48fb98-233c-4ce9-b67b-bc6163319bbd/Points-Base-times-SCM-and-LCM-2026_09.2026.pdf',
    verified: '2026-09-05',
    SCM: { edition: 'SCM (25 м) 2026', from: '2026-09-01', to: '2027-08-31' },
    LCM: { edition: 'LCM (50 м) 2026', from: '2026-01-01', to: '2026-12-31' }
};

export const BT = {
    "SCM": {
        "Men": { "50m Freestyle": 19.9, "100m Freestyle": 44.84, "200m Freestyle": 98.61, "400m Freestyle": 212.25, "800m Freestyle": 440.46, "1500m Freestyle": 846.88, "50m Backstroke": 22.11, "100m Backstroke": 48.16, "200m Backstroke": 105.12, "50m Breaststroke": 24.95, "100m Breaststroke": 55.28, "200m Breaststroke": 119.52, "50m Butterfly": 21.32, "100m Butterfly": 47.68, "200m Butterfly": 106.85, "100m Medley": 49.28, "200m Medley": 108.88, "400m Medley": 234.81 },
        "Women": { "50m Freestyle": 22.83, "100m Freestyle": 49.93, "200m Freestyle": 109.36, "400m Freestyle": 230.25, "800m Freestyle": 474, "1500m Freestyle": 908.24, "50m Backstroke": 25.23, "100m Backstroke": 54.02, "200m Backstroke": 117.33, "50m Breaststroke": 28.37, "100m Breaststroke": 62.36, "200m Breaststroke": 132.5, "50m Butterfly": 23.72, "100m Butterfly": 52.71, "200m Butterfly": 119.32, "100m Medley": 55.11, "200m Medley": 121.63, "400m Medley": 255.48 }
    },
    "LCM": {
        "Men": { "50m Freestyle": 20.91, "100m Freestyle": 46.4, "200m Freestyle": 102, "400m Freestyle": 219.96, "800m Freestyle": 452.12, "1500m Freestyle": 870.67, "50m Backstroke": 23.55, "100m Backstroke": 51.6, "200m Backstroke": 111.92, "50m Breaststroke": 25.95, "100m Breaststroke": 56.88, "200m Breaststroke": 125.48, "50m Butterfly": 22.27, "100m Butterfly": 49.45, "200m Butterfly": 110.34, "200m Medley": 112.69, "400m Medley": 242.5 },
        "Women": { "50m Freestyle": 23.61, "100m Freestyle": 51.71, "200m Freestyle": 112.23, "400m Freestyle": 234.18, "800m Freestyle": 484.12, "1500m Freestyle": 920.48, "50m Backstroke": 26.86, "100m Backstroke": 57.13, "200m Backstroke": 123.14, "50m Breaststroke": 29.16, "100m Breaststroke": 64.13, "200m Breaststroke": 137.55, "50m Butterfly": 24.43, "100m Butterfly": 54.6, "200m Butterfly": 121.81, "200m Medley": 125.7, "400m Medley": 263.65 }
    }
};

export const RU = {
    "50m Freestyle": "50 в/с", "100m Freestyle": "100 в/с", "200m Freestyle": "200 в/с",
    "400m Freestyle": "400 в/с", "800m Freestyle": "800 в/с", "1500m Freestyle": "1500 в/с",
    "50m Backstroke": "50 спина", "100m Backstroke": "100 спина", "200m Backstroke": "200 спина",
    "50m Breaststroke": "50 брасс", "100m Breaststroke": "100 брасс", "200m Breaststroke": "200 брасс",
    "50m Butterfly": "50 батт", "100m Butterfly": "100 батт", "200m Butterfly": "200 батт",
    "100m Medley": "100 к/п", "200m Medley": "200 к/п", "400m Medley": "400 к/п"
};

export const STYLE_ORDER = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Medley'];
export const STYLE_RU = {
    'Freestyle': 'Вольный',
    'Backstroke': 'Спина',
    'Breaststroke': 'Брасс',
    'Butterfly': 'Баттерфляй',
    'Medley': 'Комплекс'
};

export const STD_MAP = { "Freestyle": "вольный стиль", "Backstroke": "на спине", "Breaststroke": "брасс", "Butterfly": "баттерфляй", "Medley": "комплекс" };
export const RANKS = ["МСМК", "МС", "КМС", "I", "II", "III", "I юн", "II юн", "III юн"];


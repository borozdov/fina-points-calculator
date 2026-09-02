# FINA Points Calculator

🏊 Калькулятор очков FINA для плавания — быстрый расчёт очков по времени и времени по очкам.

**[Открыть калькулятор →](https://fina.borozdov.ru/)**

## Возможности

- ⏱ **Время → Очки** — введите результат и узнайте очки FINA
- 🎯 **Очки → Время** — узнайте, какое время нужно для целевых очков
- 🏟 Бассейны **25м** и **50м**
- 👤 Мужчины и женщины
- 🏅 Определение **разряда** по нормативам
- 🌍 Мировые рекорды для каждой дистанции
- ⭐ **Избранное** — сохраняйте результаты
- 📲 **PWA** — установите как приложение на телефон
- 🌙 Два лика: ОБСИДИАН (тёмный) и ТИТАН (светлый)
- 📴 **Оффлайн** — работает без интернета

## Технологии

- Vanilla JavaScript (ES6 Modules)
- CSS Custom Properties
- Service Worker для оффлайн-работы
- Progressive Web App (PWA)

## Структура проекта

```
├── index.html              # Главная страница
├── manifest.json           # PWA манифест
├── sw.js                   # Service Worker
├── robots.txt
├── sitemap.xml
├── css/
│   └── style.css           # Стили
├── js/
│   ├── app.js              # Главный модуль
│   ├── core/
│   │   ├── Calculator.js   # Расчёт очков FINA
│   │   └── Storage.js      # Работа с localStorage
│   ├── data/               # Данные приложения (единственный источник правды)
│   │   ├── constants.js    # Базовые времена FINA, переводы
│   │   ├── standards.js    # Нормативы по разрядам
│   │   └── world_records.js # Мировые рекорды
│   ├── helpers/
│   │   ├── utils.js        # Утилиты
│   │   └── analytics.js    # Цели Яндекс.Метрики
│   ├── lib/
│   │   └── qrcode.min.js   # Генератор QR (только для /qr)
│   └── ui/
│       ├── NativeChrome.js # Статус-бар в нативной обёртке
│       ├── Onboarding.js   # Обучение для новых пользователей
│       ├── PWAInstall.js   # Установка PWA
│       └── Share.js        # Поделиться результатом
├── qr/
│   └── index.html          # Страница с QR-кодом
├── assets/
│   └── img/                # Иконки приложения
├── scripts/
│   └── build-www.mjs       # Сборка веб-ассетов для Capacitor
└── android/                # Capacitor-обёртка для RuStore
```

## Запуск локально

Для работы ES-модулей нужен локальный сервер:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Откройте `http://localhost:8000`

## Документация

- [AUTHOR.md](AUTHOR.md) — подвал: ступени сокращения строки авторства
- [ANALYTICS.md](ANALYTICS.md) — цели Яндекс.Метрики

## Лицензия

[MIT](LICENSE) © Borozdov

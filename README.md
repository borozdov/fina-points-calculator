# FINA Points Calculator

🏊 Калькулятор очков FINA для плавания — быстрый расчёт очков по времени и времени по очкам.

**[Открыть калькулятор →](https://fina.borozdov.ru/)**

## Возможности

- ⏱ **Время → Очки** — введите результат и узнайте очки FINA
- 🎯 **Очки → Время** — узнайте, какое время нужно для целевых очков
- 🏟 Бассейны **25м** и **50м**
- 👤 Мужчины, женщины, смешанные эстафеты
- 🏅 Определение **разряда** по нормативам
- 🌍 Мировые рекорды для каждой дистанции
- ⭐ **Избранное** — сохраняйте результаты
- 📲 **PWA** — установите как приложение на телефон
- 🌙 Тёмная и светлая темы, 9 цветовых акцентов
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
├── css/
│   └── style.css           # Стили
├── js/
│   ├── app.js              # Главный модуль
│   ├── core/
│   │   ├── Calculator.js   # Расчёт очков FINA
│   │   └── Storage.js      # Работа с localStorage
│   ├── data/
│   │   ├── constants.js    # Константы и переводы
│   │   ├── standards.js    # Нормативы по разрядам
│   │   └── world_records.js # Мировые рекорды
│   ├── helpers/
│   │   └── utils.js        # Утилиты
│   └── ui/
│       ├── Onboarding.js   # Обучение для новых пользователей
│       ├── PWAInstall.js   # Установка PWA
│       └── Share.js        # Поделиться результатом
├── data/
│   ├── fina_base_times.json      # Базовые времена FINA
│   ├── swimming_standards.json   # Нормативы по плаванию
│   └── world_records.json        # Мировые рекорды
└── assets/
    └── img/                # Иконки приложения
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

## Лицензия

[MIT](LICENSE) © Borozdov

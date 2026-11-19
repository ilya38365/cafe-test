# Кафе «Тест»

Демо-сайт кафе для показа и продажи клиентам.

## Стек

- **Frontend:** React (Vite) + React Router
- **Backend:** Express API + SQLite (`node:sqlite`)
- **Языки:** русский, казахский, английский

## Возможности

- Меню, онлайн-заказ, корзина, статус заказа с устройства
- Имя клиента, WhatsApp клиенту / кафе, карта на контактах
- Админка: заказы (live + звук), меню, фото, наличие, категории, тексты сайта
- JWT, rate limit, helmet, CORS
- Production: `client/dist` раздаётся с Express / Docker

## Запуск (разработка)

```bash
npm run install:all
npm run dev
```

- Сайт: http://localhost:5173
- API: http://localhost:4000
- Админ: http://localhost:5173/admin

## Production

```bash
npm run install:all
npm run build
npm start
```

Откройте http://localhost:4000 (фронт и API вместе).

Или Docker:

```bash
docker compose up --build
```

## Переменные окружения

См. `server/.env.example`:

- `ADMIN_PASSWORD_HASH` — bcrypt-хеш пароля админа (рекомендуется)
- `ADMIN_PASSWORD` — только для локального демо, если хеша нет
- `JWT_SECRET` — длинный случайный секрет (32+)
- `CORS_ORIGIN` — URL сайта (без `/` в конце)
- `WHATSAPP_NUMBER` — номер кафе без `+`

## Безопасность

- Не коммитьте `server/.env`
- Пароль админа храните как хеш (`ADMIN_PASSWORD_HASH`)
- Смените SSH-пароль сервера (не оставляйте простой)
- Для интернета обязателен HTTPS (Nginx + Let's Encrypt)
- Ссылку `/admin` не публикуйте в меню сайта

## Перед передачей клиенту

1. Сменить пароль админа и `JWT_SECRET`
2. Поставить реальный WhatsApp и контакты
3. Заполнить меню и фото
4. Выложить на VPS с HTTPS

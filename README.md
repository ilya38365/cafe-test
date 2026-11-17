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

- `ADMIN_PASSWORD` — смените перед продажей
- `JWT_SECRET` — длинный случайный секрет
- `CORS_ORIGIN` — URL сайта (в prod обычно тот же хост)
- `WHATSAPP_NUMBER` — номер кафе без `+` (можно менять в админке)

## Перед передачей клиенту

1. Сменить пароль и `JWT_SECRET`
2. Поставить реальный WhatsApp и контакты в админке
3. Заполнить меню и фото
4. Выложить на VPS / Docker с HTTPS

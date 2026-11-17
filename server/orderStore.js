import { EventEmitter } from "events";
import { db, getSetting } from "./db.js";
import { getMenu } from "./menuStore.js";
import { config } from "./config.js";

export const orderEvents = new EventEmitter();

const ALLOWED_STATUSES = ["new", "confirmed", "in_transit", "done", "cancelled"];
export const ALLOWED_PAYMENTS = ["kaspi", "halyk", "card"];

export function getOrders() {
  const orders = db
    .prepare(`SELECT * FROM orders ORDER BY created_at DESC`)
    .all();
  return orders.map(hydrateOrder);
}

export function createOrder(payload) {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const address = String(payload.address || "").trim();
  const comment = String(payload.comment || "").trim();
  const paymentMethod = String(payload.paymentMethod || "kaspi");
  const itemsInput = Array.isArray(payload.items) ? payload.items : [];

  if (name.length < 2) throw new Error("Укажите имя");
  if (!isValidPhone(phone)) throw new Error("Укажите корректный телефон (+7…)");
  if (address.length < 5) throw new Error("Укажите адрес");
  if (!ALLOWED_PAYMENTS.includes(paymentMethod)) {
    throw new Error("Неверный способ оплаты");
  }
  if (itemsInput.length === 0) throw new Error("Корзина пуста");

  const menuItems = getMenu().flatMap((category) => category.items);
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  const items = itemsInput.map((entry) => {
    const dish = byId.get(entry.id);
    if (!dish) throw new Error(`Блюдо не найдено: ${entry.id}`);
    if (dish.available === false) throw new Error(`Нет в наличии: ${dish.name.ru}`);
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error("Количество должно быть от 1 до 20");
    }
    return {
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity,
      lineTotal: dish.price * quantity,
    };
  });

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const order = {
    id: `ord-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "new",
    name,
    phone,
    address,
    comment,
    paymentMethod,
    items,
    total,
  };
  attachWhatsApp(order);

  const insertOrder = db.prepare(`
    INSERT INTO orders
    (id, created_at, status, name, phone, address, comment, payment_method, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items
    (order_id, dish_id, name_ru, name_kk, name_en, price, quantity, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    insertOrder.run(
      order.id,
      order.createdAt,
      order.status,
      order.name,
      order.phone,
      order.address,
      order.comment,
      order.paymentMethod,
      order.total,
    );
    for (const item of items) {
      insertItem.run(
        order.id,
        item.id,
        item.name.ru,
        item.name.kk,
        item.name.en,
        item.price,
        item.quantity,
        item.lineTotal,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  orderEvents.emit("created", order);
  return order;
}

export function updateOrderStatus(orderId, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Неверный статус");
  }
  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(orderId);
  if (!existing) throw new Error("Order not found");

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
  const order = hydrateOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));
  orderEvents.emit("updated", order);
  return order;
}

export function findOrdersByIds(idsInput) {
  const ids = String(idsInput || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM orders WHERE id IN (${placeholders}) ORDER BY created_at DESC`)
    .all(...ids);

  return rows.map((row) => {
    const order = hydrateOrder(row);
    return {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      address: order.address,
      paymentMethod: order.paymentMethod,
      total: order.total,
      cafeWhatsappUrl: order.cafeWhatsappUrl,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    };
  });
}

function hydrateOrder(row) {
  const items = db
    .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`)
    .all(row.id)
    .map((item) => ({
      id: item.dish_id,
      name: { ru: item.name_ru, kk: item.name_kk, en: item.name_en },
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    }));

  const order = {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    name: row.name,
    phone: row.phone,
    address: row.address,
    comment: row.comment,
    paymentMethod: row.payment_method,
    items,
    total: row.total,
  };
  attachWhatsApp(order);
  return order;
}

function attachWhatsApp(order) {
  const text = encodeURIComponent(buildOrderMessage(order));
  const cafeNumber = digits(getSetting("whatsappNumber") || config.whatsappNumber);
  const customerNumber = digits(order.phone);

  order.whatsappUrl = customerNumber
    ? `https://wa.me/${customerNumber}?text=${text}`
    : "";
  order.cafeWhatsappUrl = cafeNumber
    ? `https://wa.me/${cafeNumber}?text=${text}`
    : "";
}

function buildOrderMessage(order) {
  const lines = [
    `Заказ ${order.id || ""}`.trim(),
    `Имя: ${order.name}`,
    `Телефон: ${order.phone}`,
    `Адрес: ${order.address}`,
    `Оплата: ${order.paymentMethod}`,
    `Сумма: ${order.total} ₸`,
  ];
  if (order.comment) lines.push(`Комментарий: ${order.comment}`);
  if (order.items?.length) {
    lines.push("Блюда:");
    for (const item of order.items) {
      lines.push(`- ${item.name.ru} × ${item.quantity}`);
    }
  }
  return lines.join("\n");
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidPhone(phone) {
  const d = digits(phone);
  return d.length >= 11 && d.length <= 15;
}

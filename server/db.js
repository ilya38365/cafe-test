import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";
import { about, cafe, contactCopy, menuCategories as seedMenu, ui } from "./data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync(config.uploadsDir, { recursive: true });
mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title_ru TEXT NOT NULL,
    title_kk TEXT NOT NULL,
    title_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    name_kk TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ru TEXT NOT NULL,
    description_kk TEXT NOT NULL,
    description_en TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL,
    total INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    dish_id TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    name_kk TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

migrateSchema();
seedIfEmpty();

function migrateSchema() {
  const dishCols = db.prepare("PRAGMA table_info(dishes)").all().map((c) => c.name);
  if (!dishCols.includes("available")) {
    db.exec("ALTER TABLE dishes ADD COLUMN available INTEGER NOT NULL DEFAULT 1");
  }
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM categories").get().c;
  if (count === 0) {
    migrateMenuFromJsonOrSeed();
  }

  const orderCount = db.prepare("SELECT COUNT(*) AS c FROM orders").get().c;
  if (orderCount === 0) {
    migrateOrdersFromJson();
  }

  const settingsCount = db.prepare("SELECT COUNT(*) AS c FROM settings").get().c;
  if (settingsCount === 0) {
    setSetting("cafe", cafe);
    setSetting("about", about);
    setSetting("contactCopy", contactCopy);
    setSetting("ui", ui);
  }

  if (getSetting("whatsappNumber") == null) {
    setSetting("whatsappNumber", config.whatsappNumber);
  }
}

function migrateMenuFromJsonOrSeed() {
  const menuFile = join(__dirname, "menu.json");
  let menu = seedMenu;
  if (existsSync(menuFile)) {
    try {
      menu = JSON.parse(readFileSync(menuFile, "utf8"));
    } catch {
      menu = seedMenu;
    }
  }
  insertMenu(menu);
}

function migrateOrdersFromJson() {
  const ordersFile = join(__dirname, "orders.json");
  if (!existsSync(ordersFile)) return;
  try {
    const orders = JSON.parse(readFileSync(ordersFile, "utf8"));
    const insertOrder = db.prepare(`
      INSERT OR IGNORE INTO orders
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
      for (const order of orders) {
        insertOrder.run(
          order.id,
          order.createdAt,
          order.status,
          order.name,
          order.phone,
          order.address,
          order.comment || "",
          order.paymentMethod,
          order.total,
        );
        for (const item of order.items || []) {
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
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } catch {
    // ignore broken legacy file
  }
}

function insertMenu(menu) {
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, title_ru, title_kk, title_en, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertDish = db.prepare(`
    INSERT INTO dishes (
      id, category_id, name_ru, name_kk, name_en,
      description_ru, description_kk, description_en,
      price, image, sort_order, available
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    menu.forEach((category, catIndex) => {
      insertCategory.run(
        category.id,
        category.title.ru,
        category.title.kk,
        category.title.en,
        catIndex,
      );
      category.items.forEach((item, itemIndex) => {
        insertDish.run(
          item.id,
          category.id,
          item.name.ru,
          item.name.kk,
          item.name.en,
          item.description.ru,
          item.description.kk,
          item.description.en,
          item.price,
          item.image,
          itemIndex,
          item.available === false ? 0 : 1,
        );
      });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, JSON.stringify(value));
}

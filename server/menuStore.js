import { db } from "./db.js";

export function getMenu() {
  const categories = db
    .prepare(
      `SELECT id, title_ru, title_kk, title_en
       FROM categories
       ORDER BY sort_order ASC, id ASC`,
    )
    .all();

  const dishes = db
    .prepare(
      `SELECT *
       FROM dishes
       ORDER BY sort_order ASC, id ASC`,
    )
    .all();

  return categories.map((category) => ({
    id: category.id,
    title: {
      ru: category.title_ru,
      kk: category.title_kk,
      en: category.title_en,
    },
    items: dishes
      .filter((dish) => dish.category_id === category.id)
      .map(mapDish),
  }));
}

export function getAdminMenu() {
  return getMenu();
}

export function getCategoriesMeta() {
  return db
    .prepare(
      `SELECT id, title_ru, title_kk, title_en
       FROM categories
       ORDER BY sort_order ASC, id ASC`,
    )
    .all()
    .map((category) => ({
      id: category.id,
      title: {
        ru: category.title_ru,
        kk: category.title_kk,
        en: category.title_en,
      },
    }));
}

export function createCategory(payload) {
  const id = createId(payload.title?.ru || payload.id || "category");
  const title = requireTri(payload.title, "Category title");
  const maxSort =
    db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories").get().m + 1;

  db.prepare(
    `INSERT INTO categories (id, title_ru, title_kk, title_en, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, title.ru, title.kk, title.en, maxSort);

  return { id, title };
}

export function updateCategory(categoryId, payload) {
  const current = db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId);
  if (!current) throw new Error("Category not found");
  const title = requireTri(
    {
      ru: payload.title?.ru ?? current.title_ru,
      kk: payload.title?.kk ?? current.title_kk,
      en: payload.title?.en ?? current.title_en,
    },
    "Category title",
  );
  db.prepare(
    `UPDATE categories SET title_ru = ?, title_kk = ?, title_en = ? WHERE id = ?`,
  ).run(title.ru, title.kk, title.en, categoryId);
  return { id: categoryId, title };
}

export function deleteCategory(categoryId) {
  const dishes = db.prepare("SELECT COUNT(*) AS c FROM dishes WHERE category_id = ?").get(categoryId).c;
  if (dishes > 0) throw new Error("Сначала удалите блюда в категории");
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(categoryId);
  if (result.changes === 0) throw new Error("Category not found");
  return true;
}

export function createDish(payload) {
  const categoryId = payload.categoryId;
  const category = db.prepare("SELECT id FROM categories WHERE id = ?").get(categoryId);
  if (!category) throw new Error("Category not found");

  const dish = normalizeDish(payload, createId(payload.name?.ru || "dish"));
  const maxSort =
    db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM dishes WHERE category_id = ?")
      .get(categoryId).m + 1;

  db.prepare(
    `INSERT INTO dishes (
      id, category_id, name_ru, name_kk, name_en,
      description_ru, description_kk, description_en,
      price, image, sort_order, available
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    dish.id,
    categoryId,
    dish.name.ru,
    dish.name.kk,
    dish.name.en,
    dish.description.ru,
    dish.description.kk,
    dish.description.en,
    dish.price,
    dish.image,
    maxSort,
    dish.available ? 1 : 0,
  );

  return dish;
}

export function updateDish(dishId, payload) {
  const current = db.prepare("SELECT * FROM dishes WHERE id = ?").get(dishId);
  if (!current) throw new Error("Dish not found");

  const nextCategoryId = payload.categoryId || current.category_id;
  const category = db.prepare("SELECT id FROM categories WHERE id = ?").get(nextCategoryId);
  if (!category) throw new Error("Category not found");

  const updated = normalizeDish(
    {
      name: {
        ru: payload.name?.ru ?? current.name_ru,
        kk: payload.name?.kk ?? current.name_kk,
        en: payload.name?.en ?? current.name_en,
      },
      description: {
        ru: payload.description?.ru ?? current.description_ru,
        kk: payload.description?.kk ?? current.description_kk,
        en: payload.description?.en ?? current.description_en,
      },
      price: payload.price ?? current.price,
      image: payload.image ?? current.image,
      available:
        payload.available != null ? Boolean(payload.available) : current.available !== 0,
    },
    dishId,
  );

  db.prepare(
    `UPDATE dishes SET
      category_id = ?,
      name_ru = ?, name_kk = ?, name_en = ?,
      description_ru = ?, description_kk = ?, description_en = ?,
      price = ?, image = ?, available = ?
     WHERE id = ?`,
  ).run(
    nextCategoryId,
    updated.name.ru,
    updated.name.kk,
    updated.name.en,
    updated.description.ru,
    updated.description.kk,
    updated.description.en,
    updated.price,
    updated.image,
    updated.available ? 1 : 0,
    dishId,
  );

  return updated;
}

export function deleteDish(dishId) {
  const result = db.prepare("DELETE FROM dishes WHERE id = ?").run(dishId);
  if (result.changes === 0) throw new Error("Dish not found");
  return true;
}

function mapDish(row) {
  return {
    id: row.id,
    name: { ru: row.name_ru, kk: row.name_kk, en: row.name_en },
    description: {
      ru: row.description_ru,
      kk: row.description_kk,
      en: row.description_en,
    },
    price: row.price,
    image: row.image,
    available: row.available !== 0,
  };
}

function normalizeDish(payload, id) {
  const price = Number(payload.price);
  if (!payload.name?.ru || !payload.name?.kk || !payload.name?.en) {
    throw new Error("Name is required in RU, KK and EN");
  }
  if (!payload.description?.ru || !payload.description?.kk || !payload.description?.en) {
    throw new Error("Description is required in RU, KK and EN");
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be a positive number");
  }
  if (!String(payload.image || "").trim()) {
    throw new Error("Image is required");
  }

  return {
    id,
    name: {
      ru: payload.name.ru.trim(),
      kk: payload.name.kk.trim(),
      en: payload.name.en.trim(),
    },
    description: {
      ru: payload.description.ru.trim(),
      kk: payload.description.kk.trim(),
      en: payload.description.en.trim(),
    },
    price: Math.round(price),
    image: String(payload.image).trim(),
    available: payload.available !== false,
  };
}

function requireTri(value, label) {
  if (!value?.ru || !value?.kk || !value?.en) {
    throw new Error(`${label} is required in RU, KK and EN`);
  }
  return {
    ru: String(value.ru).trim(),
    kk: String(value.kk).trim(),
    en: String(value.en).trim(),
  };
}

function createId(base) {
  const slug = String(base)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${slug || "id"}-${Date.now().toString(36)}`;
}

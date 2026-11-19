import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { existsSync, mkdirSync } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import {
  assertSecureConfig,
  signAdminToken,
  verifyAdminPassword,
  verifyAdminToken,
} from "./auth.js";
import { config } from "./config.js";
import { cafe as defaultCafe, ui as defaultUi } from "./data.js";
import { getSetting, setSetting } from "./db.js";
import {
  createCategory,
  createDish,
  deleteCategory,
  deleteDish,
  getAdminMenu,
  getCategoriesMeta,
  getMenu,
  updateCategory,
  updateDish,
} from "./menuStore.js";
import {
  createOrder,
  findOrdersByIds,
  getOrders,
  orderEvents,
  updateOrderStatus,
} from "./orderStore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, "../client/dist");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
assertSecureConfig();

if (!existsSync(config.uploadsDir)) {
  mkdirSync(config.uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadsDir),
    filename: (_req, file, cb) => {
      const safeExt = extname(file.originalname).toLowerCase().slice(0, 10) || ".jpg";
      cb(null, `dish-${Date.now().toString(36)}${safeExt}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "frame-src": ["'self'", "https://www.openstreetmap.org"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "script-src": ["'self'"],
        "connect-src": ["'self'"],
        // иначе браузер на http://localhost пытается уйти на https и зависает
        "upgrade-insecure-requests": null,
      },
    },
  }),
);

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalJson(body);
  };
  next();
});
app.use("/uploads", express.static(config.uploadsDir));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа. Подождите 15 минут." },
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders, try later" },
});

app.use("/api", generalLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/cafe", (_req, res) => {
  res.json(getSetting("cafe"));
});

app.get("/api/ui", (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const stored = getSetting("ui") || {};
  res.json({
    ...(defaultUi[lang] || defaultUi.ru),
    ...(stored[lang] || {}),
  });
});

app.get("/api/menu", (_req, res) => {
  res.json(getMenu());
});

app.get("/api/about", (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const about = getSetting("about") || {};
  res.json(about[lang] || about.ru || {});
});

app.get("/api/contacts", (req, res) => {
  const lang = normalizeLang(req.query.lang);
  const cafe = getSetting("cafe") || {};
  const contactCopy = getSetting("contactCopy") || {};
  const copy = contactCopy[lang] || contactCopy.ru || {};
  const whatsappNumber = String(
    getSetting("whatsappNumber") || config.whatsappNumber || "",
  ).replace(/\D/g, "");
  const mapLat = Number(cafe.mapLat ?? 43.238949);
  const mapLon = Number(cafe.mapLon ?? 76.945465);
  res.json({
    ...copy,
    phone: cafe.phone,
    email: cafe.email,
    hours: cafe.hours?.[lang] || cafe.hours?.ru,
    address: cafe.address?.[lang] || cafe.address?.ru,
    whatsappNumber,
    whatsappUrl: whatsappNumber
      ? `https://wa.me/${whatsappNumber}`
      : "",
    mapLat,
    mapLon,
    mapEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${
      mapLon - 0.02
    }%2C${mapLat - 0.015}%2C${mapLon + 0.02}%2C${
      mapLat + 0.015
    }&layer=mapnik&marker=${mapLat}%2C${mapLon}`,
  });
});

const LOCAL_STREETS = [
  "ул. Пушкина",
  "ул. Абая",
  "ул. Сатпаева",
  "ул. Толе би",
  "пр. Достык",
  "пр. Аль-Фараби",
  "ул. Назарбаева",
  "ул. Желтоксан",
  "ул. Байтурсынова",
  "ул. Розыбакиева",
  "ул. Тимирязева",
  "ул. Гоголя",
  "ул. Кабанбай батыра",
  "ул. Шевченко",
  "мкр. Самал-2",
  "мкр. Орбита-3",
];

app.get("/api/address-suggest", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  const houseMatch = q.match(/(\d+[а-яa-z]?)/i);
  const house = houseMatch ? houseMatch[1] : "";
  const queryLower = q.toLowerCase();

  const local = LOCAL_STREETS.filter(
    (street) =>
      street.toLowerCase().includes(queryLower.replace(/\d+[а-яa-z]?/gi, "").trim()) ||
      queryLower.includes(street.toLowerCase().replace(/^ул\.\s|^пр\.\s|^мкр\.\s/i, "")),
  )
    .slice(0, 6)
    .map((street) => {
      const value = house ? `${street}, д. ${house}, Алматы` : `${street}, Алматы`;
      return { label: value, value };
    });

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", `${q}, Алматы`);
    url.searchParams.set("lat", "43.238949");
    url.searchParams.set("lon", "76.945465");
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "ru");

    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return res.json(local);

    const data = await response.json();
    const remote = (data.features || []).map((feature) => {
      const props = feature.properties || {};
      const parts = [
        props.name,
        props.housenumber ? `д. ${props.housenumber}` : "",
        props.street && props.street !== props.name ? props.street : "",
        props.district,
        props.city || props.town || props.village || "Алматы",
      ].filter(Boolean);
      return { label: parts.join(", "), value: parts.join(", ") };
    });

    const merged = [...remote, ...local]
      .filter((item, index, arr) => arr.findIndex((x) => x.value === item.value) === index)
      .slice(0, 8);
    return res.json(merged.length ? merged : local);
  } catch {
    return res.json(local);
  }
});

app.post("/api/orders", orderLimiter, (req, res) => {
  try {
    const order = createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/orders/mine", (req, res) => {
  try {
    res.json(findOrdersByIds(req.query.ids));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/login", authLimiter, (req, res) => {
  const password = String(req.body?.password || "");
  if (!verifyAdminPassword(password)) {
    return res.status(401).json({ error: "Неверный пароль" });
  }

  return res.json({
    ok: true,
    token: signAdminToken(),
    whatsappNumber: config.whatsappNumber,
  });
});

app.get("/api/admin/categories", requireAdmin, (_req, res) => {
  res.json(getCategoriesMeta());
});

app.post("/api/admin/categories", requireAdmin, (req, res) => {
  try {
    const category = createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
  try {
    const category = updateCategory(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
  try {
    deleteCategory(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.get("/api/admin/menu", requireAdmin, (_req, res) => {
  res.json(getAdminMenu());
});

app.post("/api/admin/dishes", requireAdmin, (req, res) => {
  try {
    const dish = createDish(req.body);
    res.status(201).json(dish);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/dishes/:id", requireAdmin, (req, res) => {
  try {
    const dish = updateDish(req.params.id, req.body);
    res.json(dish);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.delete("/api/admin/dishes/:id", requireAdmin, (req, res) => {
  try {
    deleteDish(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post("/api/admin/upload", requireAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    return res.status(201).json({
      url: `/uploads/${req.file.filename}`,
    });
  });
});

app.get("/api/admin/settings", requireAdmin, (_req, res) => {
  const storedUi = getSetting("ui") || {};
  res.json({
    cafe: { ...defaultCafe, ...(getSetting("cafe") || {}) },
    about: getSetting("about"),
    contactCopy: getSetting("contactCopy"),
    ui: {
      ru: { ...defaultUi.ru, ...(storedUi.ru || {}) },
      kk: { ...defaultUi.kk, ...(storedUi.kk || {}) },
      en: { ...defaultUi.en, ...(storedUi.en || {}) },
    },
    whatsappNumber: getSetting("whatsappNumber") || config.whatsappNumber,
  });
});

app.put("/api/admin/settings", requireAdmin, (req, res) => {
  try {
    const { cafe, about, contactCopy, ui, whatsappNumber } = req.body || {};
    if (cafe) setSetting("cafe", cafe);
    if (about) setSetting("about", about);
    if (contactCopy) setSetting("contactCopy", contactCopy);
    if (ui) {
      const current = getSetting("ui") || {};
      setSetting("ui", {
        ru: { ...(current.ru || {}), ...(ui.ru || {}) },
        kk: { ...(current.kk || {}), ...(ui.kk || {}) },
        en: { ...(current.en || {}), ...(ui.en || {}) },
      });
    }
    if (whatsappNumber != null) {
      const digits = String(whatsappNumber).replace(/\D/g, "");
      if (digits.length < 10) {
        return res.status(400).json({ error: "Некорректный номер WhatsApp" });
      }
      setSetting("whatsappNumber", digits);
    }
    res.json({
      ok: true,
      whatsappNumber: getSetting("whatsappNumber") || config.whatsappNumber,
      cafe: getSetting("cafe"),
      ui: getSetting("ui"),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/orders", requireAdmin, (_req, res) => {
  res.json(getOrders());
});

app.get("/api/admin/orders/stream", (req, res) => {
  const token = String(req.query.token || "");
  try {
    verifyAdminToken(token);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: "hello", orders: getOrders() })}\n\n`);

  const onCreated = (order) => {
    res.write(`data: ${JSON.stringify({ type: "created", order })}\n\n`);
  };
  const onUpdated = (order) => {
    res.write(`data: ${JSON.stringify({ type: "updated", order })}\n\n`);
  };

  orderEvents.on("created", onCreated);
  orderEvents.on("updated", onUpdated);

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    orderEvents.off("created", onCreated);
    orderEvents.off("updated", onUpdated);
  });
});

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  try {
    const order = updateOrderStatus(req.params.id, req.body?.status);
    res.json(order);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    return res.sendFile(join(clientDist, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`Cafe API running at http://localhost:${config.port}`);
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    verifyAdminToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function normalizeLang(value) {
  if (value === "kk" || value === "en" || value === "ru") return value;
  return "ru";
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminLogin,
  clearAdminToken,
  createAdminCategory,
  createAdminDish,
  deleteAdminDish,
  fetchAdminCategories,
  fetchAdminMenu,
  fetchAdminOrders,
  fetchAdminSettings,
  getAdminToken,
  saveAdminSettings,
  updateAdminDish,
  updateAdminOrderStatus,
  uploadAdminImage,
} from "../api";
import { formatDateTime, formatMoney } from "../format";
import { pick } from "../i18n";
import { useLanguage } from "../context/LanguageContext";
import {
  playOrderSound,
  showOrderBrowserNotification,
  unlockOrderSound,
} from "../orderNotify";

const emptyForm = {
  categoryId: "food",
  nameRu: "",
  nameKk: "",
  nameEn: "",
  descRu: "",
  descKk: "",
  descEn: "",
  price: "",
  image: "",
  available: true,
};

const ORDER_STATUSES = [
  { id: "new", label: "Новый" },
  { id: "confirmed", label: "Подтверждён" },
  { id: "in_transit", label: "В пути" },
  { id: "done", label: "Выполнен" },
  { id: "cancelled", label: "Отменён" },
];

const emptyCafe = {
  name: "",
  phone: "",
  email: "",
  mapLat: 43.238949,
  mapLon: 76.945465,
  hours: { ru: "", kk: "", en: "" },
  address: { ru: "", kk: "", en: "" },
};

export default function Admin() {
  const { lang, ui } = useLanguage();
  const [token, setToken] = useState(getAdminToken());
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("orders");
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [live, setLive] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("77000000000");
  const [cafeForm, setCafeForm] = useState(emptyCafe);
  const [uiForm, setUiForm] = useState({
    brandRu: "",
    brandKk: "",
    brandEn: "",
    heroTitleRu: "",
    heroTitleKk: "",
    heroTitleEn: "",
    heroTextRu: "",
    heroTextKk: "",
    heroTextEn: "",
    footerTagRu: "",
    footerTagKk: "",
    footerTagEn: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    titleRu: "",
    titleKk: "",
    titleEn: "",
  });
  const knownIdsRef = useRef(new Set());
  const readyRef = useRef(false);

  const paymentLabels = {
    kaspi: "Kaspi Bank",
    halyk: "Halyk Bank",
    card: "Картой",
  };

  const dishes = useMemo(
    () =>
      menu.flatMap((category) =>
        category.items.map((item) => ({
          ...item,
          categoryId: category.id,
          categoryTitle: pick(category.title, lang),
        })),
      ),
    [menu, lang],
  );

  function applySettings(settings) {
    setWhatsappNumber(String(settings.whatsappNumber || "77000000000"));
    const cafe = settings.cafe || emptyCafe;
    setCafeForm({
      name: cafe.name || "",
      phone: cafe.phone || "",
      email: cafe.email || "",
      mapLat: cafe.mapLat ?? 43.238949,
      mapLon: cafe.mapLon ?? 76.945465,
      hours: {
        ru: cafe.hours?.ru || "",
        kk: cafe.hours?.kk || "",
        en: cafe.hours?.en || "",
      },
      address: {
        ru: cafe.address?.ru || "",
        kk: cafe.address?.kk || "",
        en: cafe.address?.en || "",
      },
    });
    const nextUi = settings.ui || {};
    setUiForm({
      brandRu: nextUi.ru?.brand || "",
      brandKk: nextUi.kk?.brand || "",
      brandEn: nextUi.en?.brand || "",
      heroTitleRu: nextUi.ru?.heroTitle || "",
      heroTitleKk: nextUi.kk?.heroTitle || "",
      heroTitleEn: nextUi.en?.heroTitle || "",
      heroTextRu: nextUi.ru?.heroText || "",
      heroTextKk: nextUi.kk?.heroText || "",
      heroTextEn: nextUi.en?.heroText || "",
      footerTagRu: nextUi.ru?.footerTag || "",
      footerTagKk: nextUi.kk?.footerTag || "",
      footerTagEn: nextUi.en?.footerTag || "",
    });
  }

  async function loadAdminData() {
    const [menuData, categoryData, orderData, settings] = await Promise.all([
      fetchAdminMenu(),
      fetchAdminCategories(),
      fetchAdminOrders(),
      fetchAdminSettings(),
    ]);
    setMenu(menuData);
    setCategories(categoryData);
    setOrders(orderData);
    applySettings(settings);
    setForm((prev) => ({
      ...prev,
      categoryId: categoryData[0]?.id || "food",
    }));
  }

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    setLoading(true);
    loadAdminData()
      .then(() => {
        if (active) setError("");
      })
      .catch((err) => {
        if (!active) return;
        clearAdminToken();
        setToken(null);
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  function notifyNewOrder(order) {
    setTab("orders");
    setHighlightId(order.id);
    setToast(
      `Новый заказ: ${order.name || order.phone} · ${formatMoney(order.total, "ru")} ₸`,
    );
    playOrderSound();
    showOrderBrowserNotification(order);
    window.setTimeout(() => setHighlightId(""), 6000);
  }

  function applyOrdersSnapshot(nextOrders, { announceNew = true } = {}) {
    const nextIds = new Set(nextOrders.map((order) => order.id));

    if (readyRef.current && announceNew) {
      const newcomers = nextOrders.filter((order) => !knownIdsRef.current.has(order.id));
      newcomers.forEach((order) => notifyNewOrder(order));
    }

    knownIdsRef.current = nextIds;
    readyRef.current = true;
    setOrders(nextOrders);
  }

  useEffect(() => {
    if (!token) return undefined;

    readyRef.current = false;
    knownIdsRef.current = new Set();
    setLive(true);

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    let stopped = false;
    let pollTimer = null;

    async function pollOrders() {
      try {
        const data = await fetchAdminOrders();
        if (!stopped) {
          applyOrdersSnapshot(data);
          setLive(true);
        }
      } catch {
        if (!stopped) setLive(false);
      }
    }

    pollOrders();
    pollTimer = window.setInterval(pollOrders, 2500);

    const streamUrl = `/api/admin/orders/stream?token=${encodeURIComponent(token)}`;
    let source = null;
    try {
      source = new EventSource(streamUrl);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "hello" && Array.isArray(payload.orders)) {
            applyOrdersSnapshot(payload.orders, { announceNew: false });
            setLive(true);
            return;
          }
          if (payload.type === "created" && payload.order) {
            const alreadyKnown = knownIdsRef.current.has(payload.order.id);
            knownIdsRef.current.add(payload.order.id);
            readyRef.current = true;
            setOrders((prev) => {
              if (prev.some((item) => item.id === payload.order.id)) return prev;
              return [payload.order, ...prev];
            });
            if (!alreadyKnown) notifyNewOrder(payload.order);
            setLive(true);
            return;
          }
          if (payload.type === "updated" && payload.order) {
            setOrders((prev) =>
              prev.map((item) => (item.id === payload.order.id ? payload.order : item)),
            );
          }
        } catch {
          // ignore malformed events
        }
      };
      source.onerror = () => setLive(false);
    } catch {
      // polling remains active
    }

    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      source?.close();
    };
  }, [token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    try {
      await adminLogin(password);
      unlockOrderSound();
      setToken(getAdminToken());
      setPassword("");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    clearAdminToken();
    setToken(null);
    setMenu([]);
    setOrders([]);
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(dish) {
    setTab("menu");
    setEditingId(dish.id);
    setForm({
      categoryId: dish.categoryId,
      nameRu: dish.name.ru,
      nameKk: dish.name.kk,
      nameEn: dish.name.en,
      descRu: dish.description.ru,
      descKk: dish.description.kk,
      descEn: dish.description.en,
      price: String(dish.price),
      image: dish.image,
      available: dish.available !== false,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id || "food",
    });
  }

  function onFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function onImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const data = await uploadAdminImage(file);
      setForm((prev) => ({ ...prev, image: data.url }));
      setMessage("Фото загружено");
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      categoryId: form.categoryId,
      name: {
        ru: form.nameRu,
        kk: form.nameKk,
        en: form.nameEn,
      },
      description: {
        ru: form.descRu,
        kk: form.descKk,
        en: form.descEn,
      },
      price: Number(form.price),
      image: form.image,
      available: form.available,
    };

    try {
      if (editingId) {
        await updateAdminDish(editingId, payload);
        setMessage("Блюдо обновлено");
      } else {
        await createAdminDish(payload);
        setMessage("Блюдо добавлено");
      }
      await loadAdminData();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Удалить это блюдо?")) return;
    setError("");
    try {
      await deleteAdminDish(id);
      await loadAdminData();
      if (editingId === id) resetForm();
      setMessage("Блюдо удалено");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleAvailable(dish) {
    setError("");
    try {
      await updateAdminDish(dish.id, {
        categoryId: dish.categoryId,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        image: dish.image,
        available: !dish.available,
      });
      await loadAdminData();
      setMessage(dish.available ? "Скрыто из заказа" : "Снова в наличии");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOrderStatus(id, status) {
    setError("");
    try {
      await updateAdminOrderStatus(id, status);
      const orderData = await fetchAdminOrders();
      setOrders(orderData);
      setMessage("Статус заказа обновлён");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await saveAdminSettings({
        whatsappNumber,
        cafe: {
          ...cafeForm,
          mapLat: Number(cafeForm.mapLat),
          mapLon: Number(cafeForm.mapLon),
        },
        ui: {
          ru: {
            brand: uiForm.brandRu,
            heroTitle: uiForm.heroTitleRu,
            heroText: uiForm.heroTextRu,
            footerTag: uiForm.footerTagRu,
          },
          kk: {
            brand: uiForm.brandKk,
            heroTitle: uiForm.heroTitleKk,
            heroText: uiForm.heroTextKk,
            footerTag: uiForm.footerTagKk,
          },
          en: {
            brand: uiForm.brandEn,
            heroTitle: uiForm.heroTitleEn,
            heroText: uiForm.heroTextEn,
            footerTag: uiForm.footerTagEn,
          },
        },
      });
      setMessage("Настройки сохранены — обновите сайт, чтобы увидеть тексты");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    setError("");
    try {
      await createAdminCategory({
        title: {
          ru: categoryForm.titleRu,
          kk: categoryForm.titleKk,
          en: categoryForm.titleEn,
        },
      });
      setCategoryForm({ titleRu: "", titleKk: "", titleEn: "" });
      await loadAdminData();
      setMessage("Категория добавлена");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <section className="page admin-page">
        <header className="page-header">
          <h1>Админ</h1>
          <p>Скрытая панель управления. Пароль только для сотрудников.</p>
        </header>
        <form
          className="admin-login"
          onSubmit={handleLogin}
          onClick={unlockOrderSound}
        >
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="admin-alert">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            Войти
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="page admin-page">
      <header className="page-header admin-header">
        <div>
          <h1>Админ-панель</h1>
          <p>Заказы обновляются сами. При новом заказе — звук и уведомление.</p>
          <p className={`live-badge ${live ? "is-on" : "is-off"}`}>
            {live ? "● Онлайн · автообновление" : "○ Переподключение…"}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            unlockOrderSound();
            handleLogout();
          }}
        >
          Выйти
        </button>
      </header>

      <div className="menu-filters admin-tabs">
        <button
          type="button"
          className={tab === "orders" ? "is-active" : ""}
          onClick={() => setTab("orders")}
        >
          Заказы ({orders.length})
        </button>
        <button
          type="button"
          className={tab === "menu" ? "is-active" : ""}
          onClick={() => setTab("menu")}
        >
          Меню ({dishes.length})
        </button>
        <button
          type="button"
          className={tab === "settings" ? "is-active" : ""}
          onClick={() => setTab("settings")}
        >
          Настройки
        </button>
      </div>

      {error ? <p className="admin-alert">{error}</p> : null}
      {message ? <p className="admin-success">{message}</p> : null}
      {loading ? <p className="page-state">Загрузка…</p> : null}
      {toast ? <div className="admin-toast">{toast}</div> : null}

      {tab === "orders" ? (
        <div className="admin-list">
          <h2>Входящие заказы</h2>
          {orders.length === 0 ? (
            <p className="order-empty">Пока нет заказов.</p>
          ) : (
            <div className="admin-orders">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className={`admin-order-card ${highlightId === order.id ? "is-new" : ""}`}
                >
                  <div className="admin-order-top">
                    <div>
                      <h3>{order.name}</h3>
                      <p>
                        {order.phone} · {formatDateTime(order.createdAt, "ru")}
                      </p>
                    </div>
                    <strong>
                      {formatMoney(order.total, "ru")} {ui?.currency}
                    </strong>
                  </div>
                  <p>{order.address}</p>
                  {order.comment ? <p className="muted">Комментарий: {order.comment}</p> : null}
                  <p className="muted">
                    Оплата: {paymentLabels[order.paymentMethod] || order.paymentMethod}
                  </p>
                  <ul>
                    {order.items.map((item) => (
                      <li key={`${order.id}-${item.id}`}>
                        {pick(item.name, lang)} × {item.quantity} —{" "}
                        {formatMoney(item.lineTotal, "ru")} {ui?.currency}
                      </li>
                    ))}
                  </ul>
                  <div className="admin-order-actions">
                    <label className="admin-status">
                      Статус
                      <select
                        value={order.status}
                        onChange={(event) => handleOrderStatus(order.id, event.target.value)}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {order.whatsappUrl ? (
                      <a
                        className="btn btn-primary"
                        href={order.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp клиенту
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="admin-settings">
          <form className="admin-form" onSubmit={handleSaveSettings}>
            <h2>WhatsApp кафе</h2>
            <p className="muted">
              Номер кафе для клиентов. Кнопка в заказе пишет клиенту на его телефон.
            </p>
            <label>
              Номер (цифры, с кодом страны)
              <input
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="77000000000"
                required
              />
            </label>

            <h2>Контакты кафе</h2>
            <div className="admin-grid">
              <label>
                Название
                <input
                  value={cafeForm.name}
                  onChange={(event) =>
                    setCafeForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Телефон
                <input
                  value={cafeForm.phone}
                  onChange={(event) =>
                    setCafeForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={cafeForm.email}
                  onChange={(event) =>
                    setCafeForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div className="admin-grid">
              <label>
                Часы (RU)
                <input
                  value={cafeForm.hours.ru}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, ru: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Часы (KK)
                <input
                  value={cafeForm.hours.kk}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, kk: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Часы (EN)
                <input
                  value={cafeForm.hours.en}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, en: event.target.value },
                    }))
                  }
                />
              </label>
            </div>

            <div className="admin-grid">
              <label>
                Адрес (RU)
                <input
                  value={cafeForm.address.ru}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      address: { ...prev.address, ru: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Адрес (KK)
                <input
                  value={cafeForm.address.kk}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      address: { ...prev.address, kk: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Адрес (EN)
                <input
                  value={cafeForm.address.en}
                  onChange={(event) =>
                    setCafeForm((prev) => ({
                      ...prev,
                      address: { ...prev.address, en: event.target.value },
                    }))
                  }
                />
              </label>
            </div>

            <div className="admin-grid admin-grid-2">
              <label>
                Карта lat
                <input
                  type="number"
                  step="any"
                  value={cafeForm.mapLat}
                  onChange={(event) =>
                    setCafeForm((prev) => ({ ...prev, mapLat: event.target.value }))
                  }
                />
              </label>
              <label>
                Карта lon
                <input
                  type="number"
                  step="any"
                  value={cafeForm.mapLon}
                  onChange={(event) =>
                    setCafeForm((prev) => ({ ...prev, mapLon: event.target.value }))
                  }
                />
              </label>
            </div>

            <h2>Тексты главной</h2>
            <div className="admin-grid">
              <label>
                Бренд RU
                <input
                  value={uiForm.brandRu}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, brandRu: event.target.value }))
                  }
                />
              </label>
              <label>
                Бренд KK
                <input
                  value={uiForm.brandKk}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, brandKk: event.target.value }))
                  }
                />
              </label>
              <label>
                Бренд EN
                <input
                  value={uiForm.brandEn}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, brandEn: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-grid">
              <label>
                Заголовок RU
                <input
                  value={uiForm.heroTitleRu}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTitleRu: event.target.value }))
                  }
                />
              </label>
              <label>
                Заголовок KK
                <input
                  value={uiForm.heroTitleKk}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTitleKk: event.target.value }))
                  }
                />
              </label>
              <label>
                Заголовок EN
                <input
                  value={uiForm.heroTitleEn}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTitleEn: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-grid">
              <label>
                Подзаголовок RU
                <textarea
                  value={uiForm.heroTextRu}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTextRu: event.target.value }))
                  }
                />
              </label>
              <label>
                Подзаголовок KK
                <textarea
                  value={uiForm.heroTextKk}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTextKk: event.target.value }))
                  }
                />
              </label>
              <label>
                Подзаголовок EN
                <textarea
                  value={uiForm.heroTextEn}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, heroTextEn: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="admin-grid">
              <label>
                Футер RU
                <input
                  value={uiForm.footerTagRu}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, footerTagRu: event.target.value }))
                  }
                />
              </label>
              <label>
                Футер KK
                <input
                  value={uiForm.footerTagKk}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, footerTagKk: event.target.value }))
                  }
                />
              </label>
              <label>
                Футер EN
                <input
                  value={uiForm.footerTagEn}
                  onChange={(event) =>
                    setUiForm((prev) => ({ ...prev, footerTagEn: event.target.value }))
                  }
                />
              </label>
            </div>

            <button className="btn btn-primary" type="submit">
              Сохранить настройки
            </button>
          </form>

          <form className="admin-form" onSubmit={handleCreateCategory}>
            <h2>Новая категория меню</h2>
            <div className="admin-grid">
              <label>
                RU
                <input
                  value={categoryForm.titleRu}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({ ...prev, titleRu: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                KK
                <input
                  value={categoryForm.titleKk}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({ ...prev, titleKk: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                EN
                <input
                  value={categoryForm.titleEn}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({ ...prev, titleEn: event.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <button className="btn btn-primary" type="submit">
              Добавить категорию
            </button>
          </form>
        </div>
      ) : null}

      {tab === "menu" ? (
        <>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-top">
              <h2>{editingId ? "Редактировать блюдо" : "Новое блюдо"}</h2>
              {editingId ? (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  Отмена
                </button>
              ) : null}
            </div>

            <label>
              Категория
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={onFieldChange}
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {pick(category.title, lang)}
                  </option>
                ))}
              </select>
            </label>

            <div className="admin-grid">
              <label>
                Название (RU)
                <input name="nameRu" value={form.nameRu} onChange={onFieldChange} required />
              </label>
              <label>
                Название (KK)
                <input name="nameKk" value={form.nameKk} onChange={onFieldChange} required />
              </label>
              <label>
                Название (EN)
                <input name="nameEn" value={form.nameEn} onChange={onFieldChange} required />
              </label>
            </div>

            <div className="admin-grid">
              <label>
                Описание (RU)
                <textarea name="descRu" value={form.descRu} onChange={onFieldChange} required />
              </label>
              <label>
                Описание (KK)
                <textarea name="descKk" value={form.descKk} onChange={onFieldChange} required />
              </label>
              <label>
                Описание (EN)
                <textarea name="descEn" value={form.descEn} onChange={onFieldChange} required />
              </label>
            </div>

            <div className="admin-grid admin-grid-2">
              <label>
                Цена (₸)
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={onFieldChange}
                  required
                />
              </label>
              <label>
                Фото (URL или загрузка)
                <input
                  name="image"
                  value={form.image}
                  onChange={onFieldChange}
                  placeholder="/uploads/... или https://..."
                  required
                />
              </label>
            </div>

            <label className="admin-check">
              <input
                type="checkbox"
                name="available"
                checked={form.available}
                onChange={onFieldChange}
              />
              В наличии (можно заказать)
            </label>

            <label>
              Загрузить фото с компьютера
              <input type="file" accept="image/*" onChange={onImageUpload} />
            </label>

            {form.image ? (
              <div className="admin-preview">
                <img src={form.image} alt="Превью блюда" />
              </div>
            ) : null}

            <button className="btn btn-primary" type="submit">
              {editingId ? "Сохранить" : "Добавить блюдо"}
            </button>
          </form>

          <div className="admin-list">
            <h2>Текущее меню ({dishes.length})</h2>
            <div className="admin-table">
              {dishes.map((dish) => (
                <article key={dish.id} className="admin-row">
                  <img src={dish.image} alt={pick(dish.name, lang)} />
                  <div>
                    <h3>
                      {pick(dish.name, lang)}
                      {dish.available === false ? (
                        <span className="soldout-badge"> нет</span>
                      ) : null}
                    </h3>
                    <p>
                      {dish.categoryTitle} · {formatMoney(dish.price, lang)} {ui?.currency}
                    </p>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => handleToggleAvailable(dish)}
                    >
                      {dish.available === false ? "В наличии" : "Скрыть"}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(dish)}>
                      Изменить
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleDelete(dish.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

const API_BASE = "/api";
const ADMIN_TOKEN_KEY = "cafe-admin-token";

async function getJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function authHeaders() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function fetchUi(lang) {
  return getJson(`/ui?lang=${lang}`);
}

export function fetchMenu() {
  return getJson("/menu");
}

export function fetchAbout(lang) {
  return getJson(`/about?lang=${lang}`);
}

export function fetchContacts(lang) {
  return getJson(`/contacts?lang=${lang}`);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminLogin(password) {
  const data = await getJson("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
  return data;
}

export function fetchAdminMenu() {
  return getJson("/admin/menu", {
    headers: authHeaders(),
  });
}

export function fetchAdminCategories() {
  return getJson("/admin/categories", {
    headers: authHeaders(),
  });
}

export function createAdminCategory(payload) {
  return getJson("/admin/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export function updateAdminCategory(id, payload) {
  return getJson(`/admin/categories/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminCategory(id) {
  return getJson(`/admin/categories/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function createAdminDish(payload) {
  return getJson("/admin/dishes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export function updateAdminDish(id, payload) {
  return getJson(`/admin/dishes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminDish(id) {
  return getJson(`/admin/dishes/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function createOrder(payload) {
  return getJson("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchAddressSuggestions(query) {
  return getJson(`/address-suggest?q=${encodeURIComponent(query)}`);
}

export function fetchMyOrders(ids) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return Promise.resolve([]);
  return getJson(`/orders/mine?ids=${encodeURIComponent(list.join(","))}`);
}

export function fetchAdminOrders() {
  return getJson("/admin/orders", {
    headers: authHeaders(),
  });
}

export function updateAdminOrderStatus(id, status) {
  return getJson(`/admin/orders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });
}

export async function uploadAdminImage(file) {
  const body = new FormData();
  body.append("image", file);
  const response = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Upload failed: ${response.status}`);
  }
  return data;
}

export function fetchAdminSettings() {
  return getJson("/admin/settings", {
    headers: authHeaders(),
  });
}

export function saveAdminSettings(payload) {
  return getJson("/admin/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

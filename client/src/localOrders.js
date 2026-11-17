const LOCAL_ORDERS_KEY = "cafe-my-orders";

export function getLocalOrderIds() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberLocalOrder(orderId) {
  if (!orderId) return;
  const ids = getLocalOrderIds().filter((id) => id !== orderId);
  ids.unshift(orderId);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(ids.slice(0, 30)));
}

export function localeFor(lang) {
  if (lang === "en") return "en-GB";
  if (lang === "kk") return "kk-KZ";
  return "ru-RU";
}

export function formatMoney(value, lang) {
  return Number(value || 0).toLocaleString(localeFor(lang));
}

export function formatDateTime(value, lang) {
  return new Date(value).toLocaleString(localeFor(lang));
}

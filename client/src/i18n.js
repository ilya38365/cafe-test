export const LANGS = [
  { code: "ru", label: "RU" },
  { code: "kk", label: "KK" },
  { code: "en", label: "EN" },
];

const STORAGE_KEY = "cafe-test-lang";

export function getInitialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "ru" || saved === "kk" || saved === "en") return saved;
  return "ru";
}

export function saveLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function pick(localized, lang) {
  if (!localized) return "";
  return localized[lang] ?? localized.ru ?? "";
}

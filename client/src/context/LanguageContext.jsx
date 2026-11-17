import { createContext, useContext, useEffect, useState } from "react";
import { fetchUi } from "../api";
import { getInitialLang, saveLang } from "../i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);
  const [ui, setUi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchUi(lang)
      .then((data) => {
        if (active) setUi(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [lang]);

  function setLang(next) {
    setLangState(next);
    saveLang(next);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, ui, loading, error }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return value;
}

import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LANGS } from "../i18n";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import CartFab from "./CartFab";
import WhatsAppFab from "./WhatsAppFab";

export default function Layout() {
  const { lang, setLang, ui } = useLanguage();
  const { count, toast } = useCart();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [lang]);

  return (
    <div className="site">
      <div className="paper-grain" aria-hidden="true" />
      <header className="topbar">
        <NavLink to="/" className="brand" onClick={() => setNavOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{ui?.brand ?? "Тест"}</span>
        </NavLink>

        <button
          type="button"
          className={`nav-toggle ${navOpen ? "is-open" : ""}`}
          aria-expanded={navOpen}
          aria-controls="site-nav"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
          <span className="sr-only">
            {navOpen ? ui?.navMenuClose : ui?.navMenuOpen}
          </span>
        </button>

        <nav
          id="site-nav"
          className={`nav ${navOpen ? "is-open" : ""}`}
          aria-label="Main"
        >
          <NavLink to="/" end onClick={() => setNavOpen(false)}>
            {ui?.navHome}
          </NavLink>
          <NavLink to="/menu" onClick={() => setNavOpen(false)}>
            {ui?.navMenu}
          </NavLink>
          <NavLink to="/order" className="nav-order" onClick={() => setNavOpen(false)}>
            {ui?.navOrder}
            {count > 0 ? <span className="cart-badge">{count}</span> : null}
          </NavLink>
          <NavLink to="/about" onClick={() => setNavOpen(false)}>
            {ui?.navAbout}
          </NavLink>
          <NavLink to="/contacts" onClick={() => setNavOpen(false)}>
            {ui?.navContacts}
          </NavLink>
        </nav>

        <div className="lang-switch" role="group" aria-label="Language">
          {LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={lang === item.code ? "is-active" : ""}
              onClick={() => setLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <p>{ui?.footerTag}</p>
        <span className="footer-line" aria-hidden="true" />
        <p className="footer-brand">{ui?.brand}</p>
      </footer>

      {toast ? <div className="site-toast">{toast}</div> : null}
      <WhatsAppFab />
      <CartFab />
    </div>
  );
}

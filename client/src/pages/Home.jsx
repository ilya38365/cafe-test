import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { ui, loading, error } = useLanguage();

  if (loading && !ui) {
    return <div className="page-state">{ui?.loading || "…"}</div>;
  }

  if (error && !ui) {
    return <div className="page-state">{error}</div>;
  }

  return (
    <section className="hero">
      <div className="hero-media" aria-hidden="true">
        <div className="hero-wash" />
        <div className="hero-lantern hero-lantern-a" />
        <div className="hero-lantern hero-lantern-b" />
        <div className="hero-steam" />
      </div>

      <div className="hero-content">
        <p className="hero-brand reveal">{ui.brand}</p>
        <h1 className="reveal reveal-delay-1">{ui.heroTitle}</h1>
        <p className="hero-text reveal reveal-delay-2">{ui.heroText}</p>
        <div className="hero-actions reveal reveal-delay-3">
          <Link className="btn btn-primary" to="/menu">
            {ui.heroCta}
          </Link>
          <Link className="btn btn-ghost" to="/about">
            {ui.heroSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}

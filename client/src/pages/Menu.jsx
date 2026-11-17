import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMenu } from "../api";
import { formatMoney } from "../format";
import { pick } from "../i18n";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

export default function Menu() {
  const { lang, ui } = useLanguage();
  const { addItem } = useCart();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMenu()
      .then((data) => {
        if (active) setCategories(data);
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
  }, []);

  const items = useMemo(() => {
    const flat = categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        categoryId: category.id,
      })),
    );

    if (activeCategory === "all") return flat;
    return flat.filter((item) => item.categoryId === activeCategory);
  }, [categories, activeCategory]);

  if (loading) return <div className="page-state">{ui?.loading}</div>;
  if (error) {
    return (
      <div className="page-state">
        {ui?.apiError}: {error}
      </div>
    );
  }

  return (
    <section className="page menu-page">
      <header className="page-header">
        <h1>{ui?.navMenu}</h1>
        <p>{ui?.menuLead}</p>
      </header>

      <div className="menu-filters" role="tablist" aria-label={ui?.navMenu}>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === "all"}
          className={activeCategory === "all" ? "is-active" : ""}
          onClick={() => setActiveCategory("all")}
        >
          {ui?.menuAll}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === category.id}
            className={activeCategory === category.id ? "is-active" : ""}
            onClick={() => setActiveCategory(category.id)}
          >
            {pick(category.title, lang)}
          </button>
        ))}
      </div>

      <div className="dish-grid">
        {items.map((item, index) => (
          <article
            key={item.id}
            className={`dish-card ${item.available === false ? "is-soldout" : ""}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="dish-media">
              <img src={item.image} alt={pick(item.name, lang)} loading="lazy" />
            </div>
            <div className="dish-meta">
              <h3>{pick(item.name, lang)}</h3>
              <p>{pick(item.description, lang)}</p>
              <div className="dish-footer">
                <span className="dish-price">
                  {formatMoney(item.price, lang)} {ui?.currency}
                </span>
                {item.available === false ? (
                  <span className="soldout-badge">{ui?.menuSoldOut}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => addItem(item, ui?.cartAdded)}
                  >
                    {ui?.menuOrderCta}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="menu-order-link">
        <Link className="btn btn-ghost" to="/order">
          {ui?.navOrder} →
        </Link>
      </div>
    </section>
  );
}

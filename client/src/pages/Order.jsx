import { useEffect, useMemo, useState } from "react";
import { fetchMenu } from "../api";
import OrderSubnav from "../components/OrderSubnav";
import { formatMoney } from "../format";
import { pick } from "../i18n";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

export default function Order() {
  const { lang, ui } = useLanguage();
  const { addItem } = useCart();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const dishes = useMemo(() => {
    const flat = categories.flatMap((category) =>
      category.items.map((item) => ({ ...item, categoryId: category.id })),
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
    <section className="page order-page">
      <header className="page-header">
        <h1>{ui?.navOrder}</h1>
        <p>{ui?.orderLead}</p>
      </header>

      <OrderSubnav />

      <div className="menu-filters" role="tablist">
        <button
          type="button"
          role="tab"
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
            className={activeCategory === category.id ? "is-active" : ""}
            onClick={() => setActiveCategory(category.id)}
          >
            {pick(category.title, lang)}
          </button>
        ))}
      </div>

      <div className="order-dish-grid order-dish-grid-wide">
        {dishes.map((dish) => (
          <article
            key={dish.id}
            className={`order-dish-card ${dish.available === false ? "is-soldout" : ""}`}
          >
            <img src={dish.image} alt={pick(dish.name, lang)} loading="lazy" />
            <div className="order-dish-body">
              <h3>{pick(dish.name, lang)}</h3>
              <p>{pick(dish.description, lang)}</p>
              <div className="order-dish-footer">
                <span>
                  {formatMoney(dish.price, lang)} {ui?.currency}
                </span>
                {dish.available === false ? (
                  <span className="soldout-badge">{ui?.menuSoldOut}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => addItem(dish, ui?.cartAdded)}
                  >
                    {ui?.orderAdd}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../api";
import OrderSubnav from "../components/OrderSubnav";
import { formatDateTime, formatMoney } from "../format";
import { getLocalOrderIds } from "../localOrders";
import { pick } from "../i18n";
import { useLanguage } from "../context/LanguageContext";

const STATUS_META = {
  new: { labelKey: "statusNew", step: 1 },
  confirmed: { labelKey: "statusConfirmed", step: 2 },
  in_transit: { labelKey: "statusInTransit", step: 3 },
  done: { labelKey: "statusDone", step: 4 },
  cancelled: { labelKey: "statusCancelled", step: 0 },
};

const PAYMENT_LABELS = {
  kaspi: "orderPayKaspi",
  halyk: "orderPayHalyk",
  card: "orderPayCard",
};

export default function OrderStatus() {
  const { lang, ui } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    const ids = getLocalOrderIds();
    if (ids.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchMyOrders(ids);
      setOrders(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="page order-status-page">
      <header className="page-header">
        <h1>{ui?.navOrder}</h1>
        <p>{ui?.orderStatusLead}</p>
      </header>

      <OrderSubnav />

      {error ? <p className="admin-alert">{error}</p> : null}
      {loading ? <p className="page-state">{ui?.loading}</p> : null}

      {!loading && orders.length === 0 && !error ? (
        <div className="checkout-empty">
          <p className="order-empty">{ui?.orderStatusEmpty}</p>
          <Link className="btn btn-primary" to="/order">
            {ui?.orderTabMenu}
          </Link>
        </div>
      ) : null}

      <div className="status-list">
        {orders.map((order) => {
          const meta = STATUS_META[order.status] || STATUS_META.new;
          return (
            <article key={order.id} className="status-card">
              <div className="status-card-top">
                <div>
                  <h2>
                    {ui?.orderStatusTitle} #{order.id}
                  </h2>
                  <p>{formatDateTime(order.createdAt, lang)}</p>
                </div>
                <span className={`status-pill status-${order.status}`}>
                  {ui?.[meta.labelKey]}
                </span>
              </div>

              {order.status !== "cancelled" ? (
                <ol className="status-steps">
                  {[
                    { id: "new", labelKey: "statusNew" },
                    { id: "confirmed", labelKey: "statusConfirmed" },
                    { id: "in_transit", labelKey: "statusInTransit" },
                    { id: "done", labelKey: "statusDone" },
                  ].map((step, index) => {
                    const active = meta.step >= index + 1;
                    return (
                      <li key={step.id} className={active ? "is-active" : ""}>
                        <span className="step-dot" />
                        <span>{ui?.[step.labelKey]}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : null}

              <p className="muted">{order.address}</p>
              <p className="muted">
                {ui?.orderPayment}: {ui?.[PAYMENT_LABELS[order.paymentMethod]] || order.paymentMethod}
              </p>
              <ul>
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.id}`}>
                    {pick(item.name, lang)} × {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="status-card-footer">
                <strong>
                  {ui?.orderTotal}: {formatMoney(order.total, lang)} {ui?.currency}
                </strong>
                {order.cafeWhatsappUrl ? (
                  <a
                    className="btn btn-ghost"
                    href={order.cafeWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {ui?.orderWhatsApp}
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

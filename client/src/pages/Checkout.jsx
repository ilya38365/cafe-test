import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createOrder, fetchAddressSuggestions } from "../api";
import { formatMoney } from "../format";
import { rememberLocalOrder } from "../localOrders";
import { pick } from "../i18n";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

const PAYMENTS = [
  { id: "kaspi", labelKey: "orderPayKaspi", icon: "🟥" },
  { id: "halyk", labelKey: "orderPayHalyk", icon: "🟩" },
  { id: "card", labelKey: "orderPayCard", icon: "💳" },
];

export default function Checkout() {
  const { lang, ui } = useLanguage();
  const { items, count, total, setQuantity, removeItem, clearCart } = useCart();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastOrderId, setLastOrderId] = useState("");
  const [cafeWhatsappUrl, setCafeWhatsappUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "+7",
    address: "",
    comment: "",
    paymentMethod: "kaspi",
  });
  const suggestTimer = useRef(null);

  function onFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "address") {
      clearTimeout(suggestTimer.current);
      if (value.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      suggestTimer.current = setTimeout(() => {
        fetchAddressSuggestions(value.trim())
          .then((data) => setSuggestions(Array.isArray(data) ? data : []))
          .catch(() => setSuggestions([]));
      }, 280);
    }
  }

  function chooseSuggestion(value) {
    setForm((prev) => ({ ...prev, address: value }));
    setSuggestions([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (items.length === 0) {
      setError(ui?.orderEmpty || "Cart is empty");
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (form.name.trim().length < 2) {
      setError(ui?.orderName || "Name");
      return;
    }
    if (phoneDigits.length < 11) {
      setError(ui?.orderPhone || "Phone");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        ...form,
        items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
      });
      rememberLocalOrder(order.id);
      setLastOrderId(order.id);
      setCafeWhatsappUrl(order.cafeWhatsappUrl || "");
      clearCart();
      setForm({
        name: "",
        phone: "+7",
        address: "",
        comment: "",
        paymentMethod: "kaspi",
      });
      setSuggestions([]);
      setSuccess(ui?.orderSuccess || "OK");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page checkout-page">
      <header className="checkout-top">
        <Link className="btn btn-ghost" to="/order">
          ← {ui?.orderTabMenu}
        </Link>
        <h1>{ui?.orderCheckout}</h1>
        <p>{ui?.orderDetailsLead}</p>
      </header>

      {error ? <p className="admin-alert">{error}</p> : null}
      {success ? (
        <div className="checkout-success">
          <p className="admin-success">{success}</p>
          {lastOrderId ? (
            <p className="muted">
              {ui?.orderStatusTitle} #{lastOrderId}
            </p>
          ) : null}
          <div className="checkout-success-actions">
            <Link className="btn btn-primary" to="/order/status">
              {ui?.orderTabStatus}
            </Link>
            {cafeWhatsappUrl ? (
              <a
                className="btn btn-ghost"
                href={cafeWhatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                {ui?.orderWhatsApp}
              </a>
            ) : null}
            <Link className="btn btn-ghost" to="/order">
              {ui?.orderTabMenu}
            </Link>
          </div>
        </div>
      ) : count === 0 ? (
        <div className="checkout-empty">
          <p className="order-empty">{ui?.orderEmpty}</p>
          <Link className="btn btn-primary" to="/order">
            {ui?.orderTabMenu}
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="checkout-cart">
            <h2>{ui?.orderCart}</h2>
            <ul className="order-cart-list">
              {items.map((item) => (
                <li key={item.id}>
                  <img src={item.image} alt={pick(item.name, lang)} />
                  <div>
                    <h3>{pick(item.name, lang)}</h3>
                    <p>
                      {formatMoney(item.price * item.quantity, lang)} {ui?.currency}
                    </p>
                    <div className="order-qty">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => removeItem(item.id)}
                      >
                        {ui?.orderRemove}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="order-total">
              <span>{ui?.orderTotal}</span>
              <strong>
                {formatMoney(total, lang)} {ui?.currency}
              </strong>
            </div>
          </div>

          <form className="order-form checkout-form" onSubmit={handleSubmit}>
            <h2>{ui?.orderCheckout}</h2>

            <label>
              {ui?.orderName}
              <input
                name="name"
                value={form.name}
                onChange={onFieldChange}
                required
                minLength={2}
                autoComplete="name"
              />
            </label>

            <label>
              {ui?.orderPhone}
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => {
                  let value = event.target.value;
                  if (!value.startsWith("+7")) {
                    value = "+7" + value.replace(/^\+?7?/, "");
                  }
                  setForm((prev) => ({ ...prev, phone: value }));
                }}
                required
                minLength={12}
              />
            </label>

            <label className="address-field">
              {ui?.orderAddress}
              <input
                name="address"
                value={form.address}
                onChange={onFieldChange}
                placeholder={ui?.orderAddressHint}
                required
                minLength={5}
                autoComplete="off"
              />
              {suggestions.length > 0 ? (
                <ul className="address-suggest">
                  {suggestions.map((item) => (
                    <li key={item.value}>
                      <button type="button" onClick={() => chooseSuggestion(item.value)}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>

            <label>
              {ui?.orderComment}
              <textarea name="comment" value={form.comment} onChange={onFieldChange} />
            </label>

            <fieldset className="order-payment">
              <legend>{ui?.orderPayment}</legend>
              <p className="muted payment-note">{ui?.orderPaymentNote}</p>
              {PAYMENTS.map((payment) => (
                <label key={payment.id} className="order-payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={payment.id}
                    checked={form.paymentMethod === payment.id}
                    onChange={onFieldChange}
                  />
                  <span className="pay-icon" aria-hidden="true">
                    {payment.icon}
                  </span>
                  <span>{ui?.[payment.labelKey]}</span>
                </label>
              ))}
            </fieldset>

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {ui?.orderSubmit}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

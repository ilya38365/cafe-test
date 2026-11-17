import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";

export default function CartFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const { ui } = useLanguage();

  if (count === 0) return null;
  if (location.pathname.startsWith("/order/checkout")) return null;

  return (
    <button
      type="button"
      className="cart-fab has-items"
      aria-label={ui?.orderOpenCart}
      onClick={() => navigate("/order/checkout")}
    >
      <span className="cart-fab-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
          <path
            d="M4 6h2l1.2 9.2a2 2 0 0 0 2 1.8h7.5a2 2 0 0 0 2-1.6L20 8H7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="20" r="1.3" fill="currentColor" />
          <circle cx="17" cy="20" r="1.3" fill="currentColor" />
        </svg>
      </span>
      <span className="cart-fab-count">{count}</span>
    </button>
  );
}

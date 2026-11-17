import { NavLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function OrderSubnav() {
  const { ui } = useLanguage();

  return (
    <div className="order-subnav" role="tablist" aria-label={ui?.navOrder}>
      <NavLink to="/order" end className={({ isActive }) => (isActive ? "is-active" : "")}>
        {ui?.orderTabMenu}
      </NavLink>
      <NavLink
        to="/order/status"
        className={({ isActive }) => (isActive ? "is-active" : "")}
      >
        {ui?.orderTabStatus}
      </NavLink>
    </div>
  );
}

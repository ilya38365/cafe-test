import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { LanguageProvider } from "./context/LanguageContext";
import { CartProvider } from "./context/CartContext";
import About from "./pages/About";
import Admin from "./pages/Admin";
import Contacts from "./pages/Contacts";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Checkout from "./pages/Checkout";
import Order from "./pages/Order";
import OrderStatus from "./pages/OrderStatus";

export default function App() {
  return (
    <LanguageProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="order">
                <Route index element={<Order />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="status" element={<OrderStatus />} />
              </Route>
              <Route path="about" element={<About />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </LanguageProvider>
  );
}

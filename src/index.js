import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AddPage from "./pages/AddPage";
import VerifyPage from "./pages/VerifyPage";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import "./App.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <nav className="nav">
      <Link to="/">🏠 Home</Link>
      <Link to="/add">➕ Add Certificate</Link>
      <Link to="/verify">🔍 Verify Certificate</Link>
      <Link to="/contact">📞 Contact Us</Link>
    </nav>

    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add" element={<AddPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* default fallback */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);

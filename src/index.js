import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AddPage from "./pages/AddPage";
import VerifyPage from "./pages/VerifyPage";
import "./App.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <nav className="nav">
      <Link to="/add">➕ Add Certificate</Link>
      <Link to="/verify">🔍 Verify Certificate</Link>
    </nav>
    <Routes>
      <Route path="/add" element={<AddPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="*" element={<AddPage />} />
    </Routes>
  </BrowserRouter>
);

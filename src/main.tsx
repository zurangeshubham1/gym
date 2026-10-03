import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const redirect = sessionStorage.getItem("gym-spa-redirect");
if (redirect) {
  sessionStorage.removeItem("gym-spa-redirect");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = redirect.startsWith(base) ? redirect.slice(base.length) || "/" : redirect;
  if (path && path !== "/" && path !== window.location.pathname) {
    window.history.replaceState(null, "", `${base}${path}`);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

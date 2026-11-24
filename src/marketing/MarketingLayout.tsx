import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { applyTheme, getStoredTheme, type Theme } from "../lib/theme";

// Public pages (logged-out home, features, FAQ, request access). Lazy-loaded
// so the app's own bundle doesn't carry the site.
export default function MarketingLayout() {
  const { pathname, hash } = useLocation();
  // Shares the app's saved theme, so one choice follows you between site and app.
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="jsl" data-theme={theme}>
      <SiteNav theme={theme} onToggleTheme={toggleTheme} />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

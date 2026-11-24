import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";

// Public pages (logged-out home, features, FAQ, request access). Lazy-loaded
// so the app's own bundle doesn't carry the site.
export default function MarketingLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="jsl">
      <SiteNav />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

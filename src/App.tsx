import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useSession } from './lib/useSession';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ReportPage from './pages/ReportPage';
import BillingPage from './pages/BillingPage';

// The public marketing pages are lazy so the app's own bundle doesn't carry them.
const MarketingLayout = lazy(() => import('./marketing/MarketingLayout'));
const HomePage = lazy(() => import('./marketing/pages/HomePage'));
const FeaturesPage = lazy(() => import('./marketing/pages/FeaturesPage'));
const FaqPage = lazy(() => import('./marketing/pages/FaqPage'));
const AccessPage = lazy(() => import('./marketing/pages/AccessPage'));

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <span className="text-sm text-stone-400">Loading…</span>
    </div>
  );
}

function AppShell({ session }: { session: Session }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 md:flex-row print:block print:h-auto print:overflow-visible">
      <Sidebar email={session.user.email} />
      <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/report" element={<ReportPage />} />
          <Route path="/projects/:id/billing" element={<BillingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;

  // Signed in: the app, exactly as before (the public pages are also reachable).
  // Signed out: / is the marketing home, /login is the sign-in form, and any
  // other address (e.g. a deep link into a project) still goes to sign-in.
  return (
    <BrowserRouter>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/access" element={<AccessPage />} />
            {!session && <Route path="/" element={<HomePage />} />}
          </Route>
          {session ? (
            <Route path="*" element={<AppShell session={session} />} />
          ) : (
            <Route path="*" element={<Login />} />
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/useSession';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ReportPage from './pages/ReportPage';
import BillingPage from './pages/BillingPage';

export default function App() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <span className="text-sm text-stone-400">Loading…</span>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 md:flex-row print:block print:h-auto print:overflow-visible">
        <Sidebar email={session.user.email} />
        <main className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/report" element={<ReportPage />} />
            <Route path="/projects/:id/billing" element={<BillingPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

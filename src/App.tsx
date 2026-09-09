import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/useSession';
import Login from './pages/Login';
import Header from './components/Header';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

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
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Header email={session.user.email} />
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

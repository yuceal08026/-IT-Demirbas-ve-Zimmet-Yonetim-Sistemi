import { useAuth } from './context/AuthContext.jsx';
import { matchPath, useRouter, Redirect } from './lib/router.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import DepartmentsPage from './pages/DepartmentsPage.jsx';
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages.jsx';

/**
 * Rota tablosu. admin: true olan sayfalar yalnızca yöneticiye görünür.
 * Bu kontrol yalnızca arayüz içindir; aynı uçlar backend'de requireRole('ADMIN') ile korunur.
 */
const ROUTES = [
  { path: '/', admin: true, element: () => <Redirect to="/users" /> },
  { path: '/users', admin: true, element: () => <UsersPage /> },
  { path: '/departments', admin: true, element: () => <DepartmentsPage /> },
  { path: '/my-assets', element: () => <ForbiddenPage /> },
];

export default function App() {
  const { user, isAdmin } = useAuth();
  const { location } = useRouter();

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Yükleniyor">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) {
    if (location.pathname !== '/login') {
      const next = encodeURIComponent(location.pathname + location.search);
      return <Redirect to={`/login?next=${next}`} />;
    }
    return <LoginPage />;
  }

  if (location.pathname === '/login') return <Redirect to={isAdmin ? '/' : '/my-assets'} />;

  for (const route of ROUTES) {
    const params = matchPath(route.path, location.pathname);
    if (!params) continue;
    if (route.admin && !isAdmin) {
      // Personel ana sayfası "Zimmetlerim"dir.
      if (route.path === '/') return <Redirect to="/my-assets" />;
      return <Layout><ForbiddenPage /></Layout>;
    }
    return <Layout>{route.element(params)}</Layout>;
  }
  return <Layout><NotFoundPage /></Layout>;
}

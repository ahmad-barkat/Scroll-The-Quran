import { Suspense, lazy, useEffect, useMemo } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Backdrop } from './components/Backdrop';
import { BottomNav } from './components/BottomNav';
import { SettingsSheet } from './components/SettingsSheet';
import { ShortcutsSheet } from './components/ShortcutsSheet';
import { Splash, LoadError } from './components/Splash';
import { SurahDrawer } from './components/SurahDrawer';
import { Toast } from './components/Toast';
import { AppProvider, useApp } from './context/AppContext';
import { ReadPage } from './pages/ReadPage';

const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const CollectionPage = lazy(() => import('./pages/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const SavedPage = lazy(() => import('./pages/SavedPage').then((m) => ({ default: m.SavedPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span>Loading</span>
    </div>
  );
}

function sceneForPath(pathname: string): number {
  if (pathname.startsWith('/read')) {
    const surah = Number(pathname.split('/')[2]) || 1;
    return Math.floor((Math.min(Math.max(surah, 1), 114) - 1) / 19);
  }
  if (pathname.startsWith('/discover')) return 5;
  if (pathname.startsWith('/search')) return 2;
  if (pathname.startsWith('/saved')) return 3;
  if (pathname.startsWith('/about')) return 4;
  return 0;
}

function Shell() {
  const { index, loading, error, reload } = useApp();
  const location = useLocation();
  const isReader = location.pathname.startsWith('/read');
  const scene = useMemo(() => sceneForPath(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!isReader) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, isReader]);

  if (loading && !index) {
    return (
      <div className="app">
        <Backdrop scene={scene} />
        <Splash />
      </div>
    );
  }

  if (!index) {
    return (
      <div className="app">
        <Backdrop scene={scene} />
        <LoadError message={error ?? 'The Quran data could not be loaded.'} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="app">
      <Backdrop scene={scene} />
      <main className={`route-stage ${isReader ? 'is-reader' : ''}`}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/read" replace />} />
            <Route path="/read" element={<ReadPage />} />
            <Route path="/read/:surah/:ayah" element={<ReadPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/discover/:slug" element={<CollectionPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/read" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
      <SurahDrawer />
      <SettingsSheet />
      <ShortcutsSheet />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </HashRouter>
  );
}

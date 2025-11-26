import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  useBackButton, 
  useViewport, 
  useThemeParams,
  useMiniApp,
  useInitData
} from '@telegram-apps/sdk-react';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AnimePage = lazy(() => import('./pages/AnimePage'));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));

export default function App() {
  const viewport = useViewport();
  const themeParams = useThemeParams();
  const miniApp = useMiniApp();
  const backButton = useBackButton();
  const initData = useInitData();
  
  // Use React Router hooks for navigation handling
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Expand viewport
    if (viewport) {
      viewport.expand();
    }

    // Apply theme
    if (themeParams) {
      // Fix: Provide a fallback value (null) if the property is undefined
      document.documentElement.style.setProperty(
        '--tg-theme-bg-color',
        themeParams.bgColor || null
      );
      document.documentElement.style.setProperty(
        '--tg-theme-text-color',
        themeParams.textColor || null
      );
    }

    // Ready
    if (miniApp) {
      miniApp.ready();
    }
  }, [viewport, themeParams, miniApp]);

  useEffect(() => {
    if (backButton) {
      // Check current path using useLocation
      if (location.pathname === '/' || location.pathname === '') {
        backButton.hide();
      } else {
        backButton.show();
      }

      // Handle back button click
      const handleBack = () => navigate(-1);
      backButton.on('click', handleBack);

      return () => {
        backButton.off('click', handleBack);
      };
    }
  }, [backButton, location, navigate]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/anime/:id" element={<AnimePage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  SDKProvider,
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

function AppContent() {
  const miniApp = useMiniApp();
  const themeParams = useThemeParams();
  const viewport = useViewport();
  const backButton = useBackButton();
  const initData = useInitData();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Expand viewport to full screen
    if (viewport) {
      viewport.expand();
    }
  }, [viewport]);

  useEffect(() => {
    // Apply theme
    if (themeParams) {
      document.documentElement.style.setProperty(
        '--tg-theme-bg-color',
        themeParams.bgColor || '#0f172a'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-text-color',
        themeParams.textColor || '#ffffff'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-button-color',
        themeParams.buttonColor || '#7c3aed'
      );
    }
  }, [themeParams]);

  useEffect(() => {
    // Set ready state
    if (miniApp) {
      miniApp.ready();
    }
  }, [miniApp]);

  useEffect(() => {
    if (backButton) {
      const isRoot = location.pathname === '/' || location.pathname === '';
      
      if (isRoot) {
        backButton.hide();
      } else {
        backButton.show();
        const handleClick = () => navigate(-1);
        backButton.on('click', handleClick);
        return () => backButton.off('click', handleClick);
      }
    }
  }, [backButton, location, navigate]);

  // Log init data for debugging
  useEffect(() => {
    if (initData) {
      console.log('[Telegram] Init Data:', initData);
    }
  }, [initData]);

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

export default function App() {
  return (
    <SDKProvider acceptCustomStyles>
      <AppContent />
    </SDKProvider>
  );
}
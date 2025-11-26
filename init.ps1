# WebApp Initialization Script for Windows
# Автоматическая инициализация и настройка WebApp

$ErrorActionPreference = "Stop"

# Настройка цветов
$ESC = [char]27
$BLUE = "$ESC[34m"
$GREEN = "$ESC[32m"
$YELLOW = "$ESC[1;33m"
$RED = "$ESC[31m"
$NC = "$ESC[0m"

Write-Host "$BLUE"
Write-Host @"
  __        __   _     _                
  \ \      / /__| |__ / \   _ __  _ __  
   \ \ /\ / / _ \ '_ \/ _ \ | '_ \| '_ \ 
    \ V  V /  __/ |_) / ___ \| |_) | |_) |
     \_/\_/ \___|_.__/_/   \_\ .__/| .__/ 
                             |_|   |_|    
    Initialization Script v1.0 (Windows Edition)
"@
Write-Host "$NC"

# Проверка что мы в корне проекта
if (-not (Test-Path "package.json")) {
    Write-Host "$RED [ERROR] Run this script from the project root folder! $NC"
    exit 1
}

Write-Host "$BLUE [INFO] Starting WebApp initialization... $NC"
Write-Host ""

# Создать директорию webapp
Write-Host "$BLUE [1/7] Creating webapp directory... $NC"
New-Item -Path "webapp" -ItemType Directory -Force | Out-Null
Set-Location "webapp"

# Инициализировать package.json
Write-Host "$BLUE [2/7] Creating package.json... $NC"
$packageJson = @'
{
  "name": "anime-webapp",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.20",
    "@tanstack/react-virtual": "^3.10.8",
    "@telegram-apps/sdk-react": "^1.1.3",
    "framer-motion": "^11.11.11",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.27.0",
    "zustand": "^5.0.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@vitejs/plugin-react-swc": "^3.7.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0-alpha.30",
    "typescript": "^5.6.3",
    "vite": "^6.0.1",
    "vite-plugin-pwa": "^0.21.0"
  }
}
'@
$packageJson | Set-Content -Path "package.json" -Encoding UTF8
Write-Host "$GREEN [OK] package.json created $NC"

# Установить зависимости
Write-Host "$BLUE [3/7] Installing dependencies (1-2 min)... $NC"
if (Get-Command "bun" -ErrorAction SilentlyContinue) {
    bun install
} else {
    Write-Host "$RED [ERROR] Bun not found. Please install Bun or run 'npm install' manually. $NC"
    exit 1
}
Write-Host "$GREEN [OK] Dependencies installed $NC"

# Создать структуру директорий
Write-Host "$BLUE [4/7] Creating directory structure... $NC"
$dirs = @("src\components", "src\pages", "src\lib", "src\store", "src\types", "public")
foreach ($dir in $dirs) {
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
}

# Создать конфигурационные файлы
Write-Host "$BLUE [5/7] Creating configuration files... $NC"

# vite.config.ts
$viteConfig = @'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AnimeVost Downloader',
        short_name: 'AnimeVost',
        theme_color: '#7c3aed',
        background_color: '#0f172a',
        display: 'standalone'
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
'@
$viteConfig | Set-Content -Path "vite.config.ts" -Encoding UTF8

# tailwind.config.ts
$tailwindConfig = @'
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#7c3aed',
          700: '#6d28d9'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
'@
$tailwindConfig | Set-Content -Path "tailwind.config.ts" -Encoding UTF8

# postcss.config.js
$postcssConfig = @'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
'@
$postcssConfig | Set-Content -Path "postcss.config.js" -Encoding UTF8

# tsconfig.json
$tsconfig = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
'@
$tsconfig | Set-Content -Path "tsconfig.json" -Encoding UTF8

# tsconfig.node.json
$tsconfigNode = @'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
'@
$tsconfigNode | Set-Content -Path "tsconfig.node.json" -Encoding UTF8

Write-Host "$GREEN [OK] Configuration files created $NC"

# Создать базовые файлы
Write-Host "$BLUE [6/7] Creating base files... $NC"

# index.html
$indexHtml = @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <meta name="theme-color" content="#7c3aed" />
    <title>AnimeVost Downloader</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@
$indexHtml | Set-Content -Path "index.html" -Encoding UTF8

Write-Host "$BLUE [7/7] Creating source files... $NC"

# src/main.tsx
$mainTsx = @'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SDKProvider } from '@telegram-apps/sdk-react';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SDKProvider acceptCustomStyles>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </SDKProvider>
  </StrictMode>
);
'@
$mainTsx | Set-Content -Path "src\main.tsx" -Encoding UTF8

# src/App.tsx
$appTsx = @'
import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useViewport, useThemeParams, useMiniApp } from '@telegram-apps/sdk-react';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/HomePage'));

export default function App() {
  const viewport = useViewport();
  const miniApp = useMiniApp();

  useEffect(() => {
    if (viewport) viewport.expand();
    if (miniApp) miniApp.ready();
  }, [viewport, miniApp]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
'@
$appTsx | Set-Content -Path "src\App.tsx" -Encoding UTF8

# src/index.css
$indexCss = @'
@import 'tailwindcss';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: #0f172a;
  color: white;
}
'@
$indexCss | Set-Content -Path "src\index.css" -Encoding UTF8

# src/types/index.ts
$typesIndex = @'
export interface AnimeCard {
  title: string;
  url: string;
  imageUrl: string;
  description: string;
}
'@
$typesIndex | Set-Content -Path "src\types\index.ts" -Encoding UTF8

# src/lib/api.ts
$apiTs = @'
import type { AnimeCard } from '../types';

const API_BASE = '';

class ApiClient {
  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }

  async getLatest(): Promise<AnimeCard[]> {
    return this.fetch('/api/anime/latest');
  }
}

export const api = new ApiClient();
'@
$apiTs | Set-Content -Path "src\lib\api.ts" -Encoding UTF8

# src/components/LoadingScreen.tsx
$loadingScreen = @'
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );
}
'@
$loadingScreen | Set-Content -Path "src\components\LoadingScreen.tsx" -Encoding UTF8

# src/components/ErrorBoundary.tsx
$errorBoundary = @'
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-white">Error occurred</div>;
    }
    return this.props.children;
  }
}
'@
$errorBoundary | Set-Content -Path "src\components\ErrorBoundary.tsx" -Encoding UTF8

# src/pages/HomePage.tsx
$homePage = @'
export default function HomePage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-white">
        AnimeVost WebApp
      </h1>
      <p className="text-gray-400 mt-4">
        WebApp successfully initialized!
      </p>
    </div>
  );
}
'@
$homePage | Set-Content -Path "src\pages\HomePage.tsx" -Encoding UTF8

Write-Host "$GREEN [OK] Source files created $NC"

# Финальная информация
Write-Host ""
Write-Host "$GREEN ======================================= $NC"
Write-Host "$GREEN      WebApp initialization complete!    $NC"
Write-Host "$GREEN ======================================= $NC"
Write-Host ""
Write-Host "$BLUE Structure created:$NC"
Write-Host "   webapp/"
Write-Host "   |-- src/"
Write-Host "   |   |-- components/"
Write-Host "   |   |-- pages/"
Write-Host "   |   |-- lib/"
Write-Host "   |   |-- store/"
Write-Host "   |   |-- types/"
Write-Host "   |-- public/"
Write-Host "   |-- configs"
Write-Host ""
Write-Host "$BLUE Next steps:$NC"
Write-Host "   $YELLOW cd webapp $NC"
Write-Host "   $YELLOW bun run dev $NC     - Start development server"
Write-Host "   $YELLOW bun run build $NC   - Build for production"
Write-Host ""
Write-Host "$BLUE URLs:$NC"
Write-Host "   Development: $YELLOW http://localhost:5173 $NC"
Write-Host "   Production:  $YELLOW http://localhost:3000 $NC"
Write-Host ""
Write-Host "$GREEN Happy coding! $NC"
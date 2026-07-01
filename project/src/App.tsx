import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import { FcaRiskBanner } from './components/FcaRiskBanner';

const AirdropDetailPage = lazy(() => import('./pages/AirdropDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AirdropImportPage = lazy(() => import('./pages/AirdropImportPage'));
const AdvertisePage = lazy(() => import('./pages/AdvertisePage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ScamAlertsPage = lazy(() => import('./pages/ScamAlertsPage'));
const SubmitAirdropPage = lazy(() => import('./pages/SubmitAirdropPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const WalletCheckerPage = lazy(() => import('./pages/WalletCheckerPage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const Layer2page = lazy(() => import('./pages/Layer2page'));
const RiskDisclosure = lazy(() => import('./pages/RiskDisclosure'));
const Whitepaper = lazy(() => import('./pages/Whitepaper'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
      Loading...
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />

          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />

              <Route path="airdrop/:slug" element={<LazyPage><AirdropDetailPage /></LazyPage>} />
              <Route path="admin" element={<LazyPage><AdminPage /></LazyPage>} />
              <Route path="admin/airdrop-import" element={<LazyPage><AirdropImportPage /></LazyPage>} />
              <Route path="advertise" element={<LazyPage><AdvertisePage /></LazyPage>} />
              <Route path="api-docs" element={<LazyPage><ApiDocsPage /></LazyPage>} />
              <Route path="auth" element={<LazyPage><AuthPage /></LazyPage>} />
              <Route path="dashboard" element={<LazyPage><CustomerDashboard /></LazyPage>} />
              <Route path="learn" element={<LazyPage><LearnPage /></LazyPage>} />
              <Route path="api-pricing" element={<LazyPage><PricingPage /></LazyPage>} />
              <Route path="pricing" element={<LazyPage><PricingPage /></LazyPage>} />
              <Route path="scam-alerts" element={<LazyPage><ScamAlertsPage /></LazyPage>} />
              <Route path="submit" element={<LazyPage><SubmitAirdropPage /></LazyPage>} />
              <Route path="terms" element={<LazyPage><TermsPage /></LazyPage>} />
              <Route path="wallet-checker" element={<LazyPage><WalletCheckerPage /></LazyPage>} />
              <Route path="articles" element={<LazyPage><ArticlesPage /></LazyPage>} />
              <Route path="articles/layer-2-airdrops-2026" element={<LazyPage><Layer2page /></LazyPage>} />
              <Route path="risk-disclosure" element={<LazyPage><RiskDisclosure /></LazyPage>} />
              <Route path="whitepaper" element={<LazyPage><Whitepaper /></LazyPage>} />
              <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
            </Route>
          </Routes>
        </BrowserRouter>

        <FcaRiskBanner />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
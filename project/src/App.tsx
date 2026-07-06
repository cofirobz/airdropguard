import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { FcaRiskBanner } from './components/FcaRiskBanner';

const Layout = lazy(() => import('./components/Layout'));
const HomePage = lazy(() => import('./pages/HomePage'));
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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />

                <Route path="airdrop/:slug" element={<AirdropDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="admin/airdrop-import" element={<AirdropImportPage />} />
                <Route path="advertise" element={<AdvertisePage />} />
                <Route path="api-docs" element={<ApiDocsPage />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="learn" element={<LearnPage />} />
                <Route path="api-pricing" element={<PricingPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="scam-alerts" element={<ScamAlertsPage />} />
                <Route path="submit" element={<SubmitAirdropPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="wallet-checker" element={<WalletCheckerPage />} />
                <Route path="articles" element={<ArticlesPage />} />
                <Route path="articles/layer-2-airdrops-2026" element={<Layer2page />} />
                <Route path="risk-disclosure" element={<RiskDisclosure />} />
                <Route path="whitepaper" element={<Whitepaper />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>

        <FcaRiskBanner />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell, { AppShellLoadingSkeleton, isAuthenticatedAppPath } from './components/AppShell';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import { FcaRiskBanner } from './components/FcaRiskBanner';
import { useAuth } from './contexts/AuthContext';
import AirdropDetailPage from './pages/AirdropDetailPage';
import AdminPage from './pages/AdminPage';
import AirdropImportPage from './pages/AirdropImportPage';
import AdvertisePage from './pages/AdvertisePage';
import ApiDocsPage from './pages/ApiDocsPage';
import AuthPage from './pages/AuthPage';
import CustomerDashboard from './pages/CustomerDashboard';
import LearnPage from './pages/LearnPage';
import PricingPage from './pages/PricingPage';
import ScamAlertsPage from './pages/ScamAlertsPage';
import SubmitAirdropPage from './pages/SubmitAirdropPage';
import TermsPage from './pages/TermsPage';
import WalletCheckerPage from './pages/WalletCheckerPage';
import ArticlesPage from './pages/ArticlesPage';
import Layer2page from './pages/Layer2page';
import RiskDisclosure from './pages/RiskDisclosure';
import Whitepaper from './pages/Whitepaper';
import NotFoundPage from './pages/NotFoundPage';

function PageLoader() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const shouldUseAppSkeleton = Boolean(user) && !isAdmin && isAuthenticatedAppPath(location.pathname);

  return (
    shouldUseAppSkeleton ? <AppShellLoadingSkeleton /> : (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    )
  );
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
        </BrowserRouter>

        <FcaRiskBanner />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
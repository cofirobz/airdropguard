import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <SEO
        title="Page Not Found | AirdropGuard"
        description="The requested page could not be found."
        noindex
      />
      <div className="text-8xl font-bold gradient-text mb-4">404</div>
      <h1 className="text-2xl font-semibold text-white mb-3">Page not found</h1>
      <p className="text-gray-400 mb-8 max-w-sm">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" className="btn-primary flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Airdrops
      </Link>
    </div>
  );
}

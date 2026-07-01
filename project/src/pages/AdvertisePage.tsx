import { BadgeDollarSign, Globe, Users, TrendingUp, Mail, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PACKAGES = [
  {
    name: 'Featured Listing',
    price: '$299',
    period: '/month',
    desc: 'Your airdrop pinned at the top of the homepage with a featured badge.',
    features: ['Homepage featured slot', 'Sponsored badge', 'Priority placement in all filters', 'Email blast to subscribers'],
    color: 'border-neon-purple/30',
    badge: 'Most Popular',
  },
  {
    name: 'Banner Ad',
    price: '$149',
    period: '/month',
    desc: 'Display banner placement across all airdrop listing pages.',
    features: ['Rotating banner placement', 'Desktop & mobile', 'Click-through tracking', 'Custom creative'],
    color: 'border-white/10',
    badge: null,
  },
  {
    name: 'Newsletter Mention',
    price: '$99',
    period: '/send',
    desc: 'One-time feature in our weekly airdrop digest email.',
    features: ['Dedicated section', '5,000+ subscribers', 'Custom copy written by us', 'Permanent archive link'],
    color: 'border-white/10',
    badge: null,
  },
];

export default function AdvertisePage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState<'featured_listing' | 'banner_ad' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleCheckout = async (plan: 'featured_listing' | 'banner_ad') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setCheckoutLoading(plan);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          plan,
          purchase_type: 'advertising',
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (error) throw error;

      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No checkout URL returned');

      window.location.assign(url);
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-500/20 text-xs font-semibold text-emerald-400 mb-5">
          <BadgeDollarSign className="w-3.5 h-3.5" />
          Grow your airdrop
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Advertise on Airdrop Guard</h1>
        <p className="text-gray-400 leading-relaxed">
          Reach thousands of active crypto users who are actively looking for new airdrops to participate in.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-16">
        {[
          { icon: Users, label: 'Monthly Visitors', value: '50K+' },
          { icon: TrendingUp, label: 'Avg. CTR', value: '8.4%' },
          { icon: Globe, label: 'Countries', value: '120+' },
        ].map(s => (
          <div key={s.label} className="glass-card p-5 text-center">
            <s.icon className="w-6 h-6 text-neon-purple mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Packages */}
      <h2 className="text-xl font-bold text-white mb-6">Advertising Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
        {PACKAGES.map(pkg => (
          <div key={pkg.name} className={`glass-card p-6 border ${pkg.color} relative`}>
            {pkg.badge && (
              <span className="absolute -top-3 left-4 text-xs font-semibold text-neon-purple bg-dark-950 border border-neon-purple/30 px-3 py-1 rounded-full">
                {pkg.badge}
              </span>
            )}
            <h3 className="text-base font-bold text-white mb-1">{pkg.name}</h3>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-2xl font-bold gradient-text">{pkg.price}</span>
              <span className="text-gray-500 text-sm mb-0.5">{pkg.period}</span>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{pkg.desc}</p>
            <ul className="space-y-2 mb-4">
              {pkg.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {pkg.name === 'Featured Listing' ? (
              <button
                type="button"
                onClick={() => handleCheckout('featured_listing')}
                disabled={authLoading || checkoutLoading !== null}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all btn-primary shadow-lg shadow-neon-purple/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'featured_listing' ? 'Redirecting…' : 'Buy featured listing'}
              </button>
            ) : pkg.name === 'Banner Ad' ? (
              <button
                type="button"
                onClick={() => handleCheckout('banner_ad')}
                disabled={authLoading || checkoutLoading !== null}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkoutLoading === 'banner_ad' ? 'Redirecting…' : 'Buy banner ad'}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Contact form */}
      <div className="glass-card p-8 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-white mb-2">Get in touch</h2>
        <p className="text-gray-400 text-sm mb-6">Tell us about your project and we will prepare a custom proposal.</p>

        {submitted ? (
          <div className="flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Thanks! We will be in touch within 24 hours.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourproject.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Project / Airdrop name</label>
              <input
                type="text" required value={project} onChange={e => setProject(e.target.value)}
                placeholder="My Airdrop Project"
                className="w-full px-4 py-2.5 bg-dark-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 transition-colors"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3 text-sm">
              Submit Enquiry
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

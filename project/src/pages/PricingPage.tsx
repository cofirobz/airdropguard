import { Key, Check, Zap, Shield, Building2, Star, Users, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Plan data ────────────────────────────────────────────────────────────────

interface Plan {
  name: string;
  price: string;
  period: string;
  requestsLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  enterprise: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '£0',
    period: '/month',
    requestsLabel: '100 requests / day',
    description: 'Explore the API at no cost.',
    features: [
      'Basic airdrop data',
      'Public endpoints',
      '100 API requests per day',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlight: false,
    enterprise: false,
    icon: Key,
  },
  {
    name: 'Pro',
    price: '£29',
    period: '/month',
    requestsLabel: '50,000 requests / month',
    description: 'For builders shipping real products.',
    features: [
      'Full API access',
      '50,000 API requests / month',
      'Verified project data',
      'Scam risk indicators',
      'Priority support',
    ],
    cta: 'Start Pro',
    highlight: true,
    enterprise: false,
    icon: Zap,
  },
  {
    name: 'Business',
    price: '£99',
    period: '/month',
    requestsLabel: '250,000 requests / month',
    description: 'Scale with confidence and history.',
    features: [
      'Full API access',
      '250,000 API requests / month',
      'Historical airdrop data',
      'Higher rate limits',
      'Priority support',
      'Commercial usage',
    ],
    cta: 'Start Business',
    highlight: false,
    enterprise: false,
    icon: Building2,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    requestsLabel: 'Unlimited requests',
    description: 'Tailored for large-scale operations.',
    features: [
      'Unlimited API requests',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'White-label licensing',
    ],
    cta: 'Contact Us',
    highlight: false,
    enterprise: true,
    icon: Users,
  },
];

// ─── Trust strip items ────────────────────────────────────────────────────────

const TRUST = [
  { icon: Shield, text: 'Free plan — no card needed' },
  { icon: Zap,    text: 'Instant API key on signup'  },
  { icon: Key,    text: 'Cancel anytime, no lock-in' },
];

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onCheckout, checkoutLoading }: { plan: Plan; onCheckout: (plan: 'pro' | 'business') => void; checkoutLoading: string | null }) {
  const { icon: Icon } = plan;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
        plan.highlight
          ? 'bg-gradient-to-b from-neon-purple/[0.12] to-dark-800/60 border border-neon-purple/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] scale-[1.02]'
          : 'glass-card'
      }`}
    >
      {/* Most Popular badge */}
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-lg shadow-neon-purple/30 whitespace-nowrap">
            <Star className="w-3 h-3 fill-current" />
            Most Popular
          </span>
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4 mt-1">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          plan.highlight
            ? 'bg-neon-purple/20 border border-neon-purple/30'
            : 'bg-white/5 border border-white/10'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${plan.highlight ? 'text-neon-purple' : 'text-gray-400'}`} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{plan.name}</h2>
          <p className="text-[11px] text-gray-500 leading-tight">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1">
        <div className="flex items-end gap-1">
          <span className={`text-4xl font-bold tracking-tight ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
          )}
        </div>
        <p className={`text-xs mt-1 font-medium ${plan.highlight ? 'text-neon-purple' : 'text-gray-500'}`}>
          {plan.requestsLabel}
        </p>
      </div>

      {/* Divider */}
      <div className={`my-5 h-px ${plan.highlight ? 'bg-neon-purple/20' : 'bg-white/5'}`} />

      {/* Features */}
      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? 'text-neon-purple' : 'text-emerald-400'}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.enterprise ? (
        <a
          href="mailto:cofirobz@googlemail.com"
          onClick={() => {
            console.log('Paid API button clicked');
            console.log('Selected plan', 'enterprise');
          }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          {plan.cta}
        </a>
      ) : plan.name === 'Pro' || plan.name === 'Business' ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('Paid API button clicked');
            console.log('Selected plan', plan.name.toLowerCase());
            onCheckout(plan.name.toLowerCase() as 'pro' | 'business');
          }}
          disabled={checkoutLoading !== null}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${
            plan.highlight
              ? 'btn-primary shadow-lg shadow-neon-purple/20'
              : 'border border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
          } ${checkoutLoading !== null ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {checkoutLoading === plan.name.toLowerCase() ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting…
            </span>
          ) : plan.cta}
        </button>
      ) : (
        <Link
          to="/auth"
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${
            plan.highlight
              ? 'btn-primary shadow-lg shadow-neon-purple/20'
              : 'border border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          {plan.cta}
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (plan: 'pro' | 'business') => {
    console.log('Starting checkout', plan);

    if (!user) {
      setCheckoutLoading(plan);
      setCheckoutError(null);
      navigate(`/auth?checkout=${plan}`);
      return;
    }

    setCheckoutLoading(plan);
    setCheckoutError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { plan, purchase_type: 'api' },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      console.log('Checkout response', data);

      if (error) throw error;

      const url = (data as { url?: string } | null)?.url;
      if (!url) {
        setCheckoutError('Stripe checkout is unavailable right now. Please try again shortly.');
        setCheckoutLoading(null);
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setCheckoutError('Unable to start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;

    const checkoutPlan = searchParams.get('checkout');
    if (!checkoutPlan || (checkoutPlan !== 'pro' && checkoutPlan !== 'business')) return;
    if (checkoutLoading === checkoutPlan) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('checkout');
    const nextSearch = nextParams.toString();

    navigate({ pathname: '/api-pricing', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
    void handleCheckout(checkoutPlan as 'pro' | 'business');
  }, [authLoading, checkoutLoading, navigate, searchParams, user]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-purple/20 text-xs font-semibold text-neon-purple mb-5">
          <Key className="w-3.5 h-3.5" />
          API Pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-400 leading-relaxed">
          Embed live airdrop intelligence directly into your app or bot.
          Start for free — scale when you're ready.
        </p>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 items-start">
        {PLANS.map(plan => (
          <PlanCard key={plan.name} plan={plan} onCheckout={handleCheckout} checkoutLoading={checkoutLoading} />
        ))}
      </div>

      {checkoutError && (
        <p className="text-center text-sm text-rose-400 mb-6">{checkoutError}</p>
      )}

      {/* Trust strip */}
      <div className="glass border border-white/5 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
        {TRUST.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 text-sm text-gray-400">
            <Icon className="w-4 h-4 text-neon-purple shrink-0" />
            {text}
          </div>
        ))}
      </div>

      {/* FAQ hint */}
      <p className="text-center text-xs text-gray-600 mt-6">
        All prices in GBP and exclude VAT where applicable.
        Need a custom quote?{' '}
        <a href="mailto:cofirobz@googlemail.com" className="text-neon-purple hover:underline">
          Get in touch
        </a>
        .
      </p>
    </div>
  );
}

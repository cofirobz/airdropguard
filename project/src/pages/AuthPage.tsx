import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

declare function gtag(...args: unknown[]): void;

export default function AuthPage() {
  const { signIn, signUp, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect already-authenticated users to the right destination
  if (!authLoading && user) {
    const dest = redirect ?? (isAdmin ? '/admin' : '/dashboard');
    navigate(dest);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password);
      if (err) { setError(err); setLoading(false); return; }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'sign_up', { method: 'email' });
      }
      setSuccess('Account created! Sign in below.');
      setMode('signin');
    } else {
      const { error: err } = await signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      // Check admin status directly so we can redirect immediately
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser) {
        const { data: adminRow } = await supabase
          .from('admin_users').select('id').eq('id', freshUser.id).maybeSingle();
        navigate(redirect ?? (adminRow ? '/admin' : '/dashboard'));
      } else {
        navigate(redirect ?? '/dashboard');
      }
    }
    setLoading(false);
  };

  const inputClass = 'w-full pl-11 pr-4 py-3 bg-dark-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple/40 transition-colors';

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="glass-card p-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 border border-neon-purple/20 flex items-center justify-center">
            <Shield className="w-7 h-7 text-neon-purple" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-gray-400 text-center mb-6">
          {mode === 'signin' ? 'Sign in to access your API dashboard' : 'Get started with free API access'}
        </p>

        {/* Toggle */}
        <div className="flex bg-dark-700/40 rounded-xl p-1 mb-6 gap-1">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-400 hover:text-white'}`}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-4 p-3 bg-red-500/10 rounded-xl border border-red-500/15">{error}</p>}
        {success && <p className="text-sm text-neon-purple mb-4 p-3 bg-neon-purple/5 rounded-xl border border-neon-purple/20">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className={inputClass} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full pl-11 pr-11 py-3 bg-dark-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple/40 transition-colors"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-6">
          Looking for API pricing?{' '}
          <Link to="/pricing" className="text-neon-purple hover:underline">View plans</Link>
        </p>
      </div>
    </div>
  );
}

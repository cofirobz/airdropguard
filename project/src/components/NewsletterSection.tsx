import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setMsg('');

    const { error } = await supabase.from('newsletter_subscribers').insert({ email });
    if (error) {
      if (error.code === '23505') {
        setMsg("You're already subscribed.");
        setStatus('success');
      } else {
        setMsg('Failed to subscribe. Please try again.');
        setStatus('error');
      }
    } else {
      setMsg('Subscribed! We will notify you of new airdrops.');
      setStatus('success');
      setEmail('');
    }
  };

  return (
    <section className="py-16 border-t border-white/5">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-purple/20 text-xs font-semibold text-neon-purple mb-5">
          <Mail className="w-3.5 h-3.5" />
          Never miss a drop
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          Get notified of new airdrops
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          Weekly digest of the highest-potential new airdrops, straight to your inbox. No spam.
        </p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5" />
            {msg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-dark-700/60 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 transition-colors"
              />
            </div>
            <button type="submit" disabled={status === 'loading'} className="btn-primary px-6 py-3 shrink-0 disabled:opacity-60">
              {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mt-3">
            <AlertCircle className="w-4 h-4" />
            {msg}
          </div>
        )}
      </div>
    </section>
  );
}

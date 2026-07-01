import { ShieldCheck, Zap, Star } from 'lucide-react';

const ITEMS = [
  { icon: ShieldCheck, label: 'AI-Verified Listings', color: 'text-emerald-400' },
  { icon: Zap, label: 'Real-Time Updates', color: 'text-amber-400' },
  { icon: Star, label: 'Trust Scored', color: 'text-neon-purple' },
  { icon: ShieldCheck, label: 'Risk Analysed', color: 'text-neon-blue' },
  { icon: Zap, label: 'Step-by-Step Tasks', color: 'text-neon-cyan' },
];

export default function TrustStrip() {
  return (
    <div className="border-y border-white/5 bg-dark-900/40 py-4 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
              <item.icon className={`w-4 h-4 shrink-0 ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { BadgeDollarSign, CheckCircle2, Crown, Megaphone, Monitor, Smartphone, Sparkles } from 'lucide-react';

type Placement = {
  name: string;
  benefits: string[];
};

const PLACEMENTS: Placement[] = [
  {
    name: 'Homepage Hero Banner',
    benefits: ['Prime first-screen visibility', 'Appears next to trusted discovery tools', 'Desktop + mobile creative support'],
  },
  {
    name: 'Homepage Mid-Page Banner',
    benefits: ['Placed during active browsing flow', 'Strong engagement from researching users', 'Ideal for campaign announcements'],
  },
  {
    name: 'Airdrop Detail Banner',
    benefits: ['Contextual visibility on detail pages', 'High-intent audience reviewing projects', 'Supports direct action CTAs'],
  },
  {
    name: 'Dashboard Banner',
    benefits: ['Persistent placement for returning users', 'Seen by active wallet/task users', 'Great for sustained campaigns'],
  },
];

export default function AdvertisePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-amber-500/25 text-xs font-semibold text-amber-300 mb-5">
          <BadgeDollarSign className="w-3.5 h-3.5" />
          Professional banner advertising
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Advertise on AirdropGuard</h1>
        <p className="text-gray-400 leading-relaxed">
          Premium placements for serious Web3 brands. Every placement is exclusive, clearly marked as sponsored advertising, and designed to preserve trust.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[linear-gradient(140deg,rgba(255,196,0,0.12),rgba(8,12,20,0.94))] p-6 sm:p-7 mb-10">
        <h2 className="text-xl font-bold text-white mb-2">Banner Advertising</h2>
        <p className="text-sm text-gray-300 mb-1">$149 per banner placement.</p>
        <p className="text-sm text-gray-300 mb-4">Each placement is purchased separately.</p>
        <p className="text-xs text-amber-200/90 font-semibold">Only ONE advertiser can occupy each placement at one time.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {PLACEMENTS.map((placement, index) => (
          <article key={placement.name} className="glass-card border border-white/10 p-5 sm:p-6 rounded-2xl">
            <div className="rounded-xl border border-cyan-500/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.08),rgba(8,16,35,0.96))] h-28 sm:h-32 p-3 flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase tracking-wider text-cyan-200 font-semibold">Premium mockup</div>
              <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <Crown className="w-3.5 h-3.5" />
                Exclusive Placement
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2">{placement.name}</h3>
            <ul className="space-y-1.5 mb-4">
              {placement.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-xs text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3">
              <div className="text-2xl font-bold gradient-text">$149</div>
              <a
                href={`mailto:ads@airdropguard.com?subject=Banner%20Enquiry%20-%20${encodeURIComponent(placement.name)}&body=I%20would%20like%20to%20enquire%20about%20the%20${encodeURIComponent(placement.name)}%20placement.`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 transition-colors"
              >
                <Megaphone className="w-4 h-4" />
                Enquire Now
              </a>
            </div>

            <div className="mt-3 text-[11px] text-gray-500">Placement slot {index + 1} of 4</div>
          </article>
        ))}
      </section>

      <section className="glass-card border border-white/10 p-6 rounded-2xl mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Why advertise with AirdropGuard?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
          <div className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />Reach a targeted Web3 audience</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />Appear alongside AI + human verified content</div>
          <div className="flex items-start gap-2"><Monitor className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" /><span>Premium desktop and <Smartphone className="w-3 h-3 inline mb-0.5" /> mobile placements</span></div>
          <div className="flex items-start gap-2"><Crown className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />Exclusive placement with no competing banner</div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 mb-8">
        <h2 className="text-base font-bold text-amber-200 mb-2">More advertising opportunities are coming soon.</h2>
        <p className="text-sm text-amber-100/90">We are expanding placements while preserving quality and user trust.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Sponsored Content Policy</h2>
        <ul className="space-y-2 text-xs text-gray-300">
          <li>All adverts are clearly labelled as <span className="font-semibold text-white">Sponsored</span> or <span className="font-semibold text-white">Advertisement</span>.</li>
          <li>Sponsored content never appears as AI recommendations.</li>
          <li>Sponsored content never appears as human verification.</li>
          <li>Sponsored content never appears as Trust Scores.</li>
          <li>Sponsored content never appears as Featured by AirdropGuard.</li>
        </ul>
      </section>
    </div>
  );
}

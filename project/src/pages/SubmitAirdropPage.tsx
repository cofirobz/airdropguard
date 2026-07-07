import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BLOCKCHAIN_OPTIONS, CATEGORY_OPTIONS } from '../lib/types';
import SEO from '../components/SEO';
import { canonicalFromPath } from '../lib/seo';

// ── Reusable form primitives ──────────────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-300 mb-1.5">
      {text}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
  );
}

function Input({ name, value, onChange, type = 'text', placeholder }: {
  name: string; value: string; onChange: (n: string, v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(name, e.target.value)}
      className="w-full bg-dark-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/20 transition-colors"
    />
  );
}

function Textarea({ name, value, onChange, placeholder, rows = 3 }: {
  name: string; value: string; onChange: (n: string, v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(name, e.target.value)}
      className="w-full bg-dark-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/20 transition-colors resize-none"
    />
  );
}

function Select({ name, value, onChange, options, placeholder }: {
  name: string; value: string; onChange: (n: string, v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(name, e.target.value)}
      className="w-full bg-dark-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/20 transition-colors appearance-none"
    >
      {placeholder && <option value="" className="text-gray-500 bg-dark-900">{placeholder}</option>}
      {options.map(o => <option key={o} value={o} className="bg-dark-900">{o}</option>)}
    </select>
  );
}

function Toggle({ name, checked, onChange, label }: {
  name: string; checked: boolean; onChange: (n: string, v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(name, !checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-neon-purple' : 'bg-dark-600 border border-white/10'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </label>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-white/5" />
      <div className="text-center">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ── Form state type ───────────────────────────────────────────────────────────
type FormState = {
  project_name: string; website_url: string; twitter_url: string;
  discord_url: string; telegram_url: string; blockchain: string; category: string;
  airdrop_type: string; description: string; tasks_required: string;
  deadline: string; reward_confirmed: string; token_confirmed: string;
  token_name: string; token_symbol: string; token_address: string;
  eligibility_requirements: string; team_info: string; funding_investors: string;
  whitepaper_url: string; github_url: string; contract_address: string; audit_url: string;
  requires_wallet_connection: boolean; requires_transaction: boolean;
  requires_payment: boolean; requires_seed_phrase: boolean; additional_notes: string;
};

const EMPTY: FormState = {
  project_name: '', website_url: '', twitter_url: '', discord_url: '', telegram_url: '',
  blockchain: '', category: '', airdrop_type: '', description: '', tasks_required: '',
  deadline: '', reward_confirmed: 'Unknown', token_confirmed: 'Unknown',
  token_name: '', token_symbol: '', token_address: '',
  eligibility_requirements: '', team_info: '', funding_investors: '', whitepaper_url: '',
  github_url: '', contract_address: '', audit_url: '',
  requires_wallet_connection: false, requires_transaction: false,
  requires_payment: false, requires_seed_phrase: false, additional_notes: '',
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SubmitAirdropPage() {
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function set(name: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_name.trim()) { setError('Project name is required.'); return; }
    if (form.token_confirmed === 'Yes') {
      if (!form.token_name.trim()) { setError('Token name is required when token is confirmed.'); return; }
      if (!form.token_symbol.trim()) { setError('Token symbol is required when token is confirmed.'); return; }
    }
    setSubmitting(true);
    setError(null);

    const { data, error: dbErr } = await supabase
      .from('airdrop_submissions')
      .insert({
        ...form,
        deadline: form.deadline || null,
      })
      .select('id')
      .single();

    if (dbErr) {
      setError(dbErr.message);
      setSubmitting(false);
      return;
    }

    // Fire-and-forget admin notification
    supabase.functions.invoke('notify-submission', {
      body: { project_name: form.project_name, website_url: form.website_url, submission_id: data.id },
    }).catch(() => {/* email failure is non-fatal */});

    setSuccess(true);
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Submission Received</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Thanks for submitting <span className="text-white font-medium">{form.project_name}</span>.
          Our team will review it and update you if it meets the listing criteria.
          Reviews typically take 2–5 business days.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => { setForm(EMPTY); setSuccess(false); }}
            className="btn-primary text-sm">
            Submit Another Project
          </button>
          <Link to="/" className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium glass border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Submit a Crypto Airdrop for Review | AirdropGuard"
        description="Submit your crypto airdrop for manual review, trust scoring, and listing consideration on AirdropGuard."
        canonical={canonicalFromPath('/submit')}
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': 'https://airdropguard.com/submit#webpage',
              name: 'Submit Airdrop',
              url: 'https://airdropguard.com/submit',
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://airdropguard.com/submit#breadcrumb',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airdropguard.com/' },
                { '@type': 'ListItem', position: 2, name: 'Submit Airdrop', item: 'https://airdropguard.com/submit' },
              ],
            },
          ],
        }}
      />
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-purple/20 text-xs font-semibold text-neon-purple mb-5">
          <Send className="w-3.5 h-3.5" />
          Project Submission
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Submit Your Airdrop</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
          Fill in as much detail as possible. Our team manually reviews every submission.
          Approved projects get a verified listing with full trust scoring.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Basic Information ──────────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <SectionHeader title="Basic Information" />
          <div>
            <Label text="Project Name" required />
            <Input name="project_name" value={form.project_name} onChange={set} placeholder="e.g. Hyperliquid" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Website" />
              <Input name="website_url" value={form.website_url} onChange={set} type="url" placeholder="https://..." />
            </div>
            <div>
              <Label text="X / Twitter" />
              <Input name="twitter_url" value={form.twitter_url} onChange={set} type="url" placeholder="https://x.com/..." />
            </div>
            <div>
              <Label text="Discord" />
              <Input name="discord_url" value={form.discord_url} onChange={set} type="url" placeholder="https://discord.gg/..." />
            </div>
            <div>
              <Label text="Telegram" />
              <Input name="telegram_url" value={form.telegram_url} onChange={set} type="url" placeholder="https://t.me/..." />
            </div>
            <div>
              <Label text="Blockchain / Network" />
              <Select name="blockchain" value={form.blockchain} onChange={set}
                options={BLOCKCHAIN_OPTIONS} placeholder="Select blockchain" />
            </div>
            <div>
              <Label text="Category" />
              <Select name="category" value={form.category} onChange={set}
                options={CATEGORY_OPTIONS} placeholder="Select category" />
            </div>
          </div>
        </div>

        {/* ── Airdrop Information ────────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <SectionHeader title="Airdrop Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Airdrop Type" />
              <Select name="airdrop_type" value={form.airdrop_type} onChange={set}
                options={['Retroactive', 'Prospective', 'Testnet', 'Social', 'Other']}
                placeholder="Select type" />
            </div>
            <div>
              <Label text="Deadline" />
              <Input name="deadline" value={form.deadline} onChange={set} type="date" />
            </div>
            <div>
              <Label text="Reward Confirmed?" />
              <Select name="reward_confirmed" value={form.reward_confirmed} onChange={set}
                options={['Yes', 'No', 'Unknown']} />
            </div>
            <div>
              <Label text="Token Confirmed?" />
              <Select name="token_confirmed" value={form.token_confirmed} onChange={set}
                options={['Yes', 'No', 'Unknown']} />
            </div>
          </div>
          {form.token_confirmed === 'Yes' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label text="Token Name" required />
                <Input name="token_name" value={form.token_name} onChange={set} placeholder="e.g. Hyperliquid" />
              </div>
              <div>
                <Label text="Token Symbol" required />
                <Input name="token_symbol" value={form.token_symbol} onChange={set} placeholder="e.g. HYPE" />
              </div>
              <div>
                <Label text="Token Contract Address" />
                <Input name="token_address" value={form.token_address} onChange={set} placeholder="0x... or Solana address" />
              </div>
            </div>
          )}
          <div>
            <Label text="Description" />
            <Textarea name="description" value={form.description} onChange={set}
              placeholder="Describe the project and what the airdrop is for..." rows={4} />
          </div>
          <div>
            <Label text="Tasks Required" />
            <Textarea name="tasks_required" value={form.tasks_required} onChange={set}
              placeholder="List the steps users need to complete (e.g. follow on X, join Discord, bridge assets...)" rows={3} />
          </div>
          <div>
            <Label text="Eligibility Requirements" />
            <Textarea name="eligibility_requirements" value={form.eligibility_requirements} onChange={set}
              placeholder="Who qualifies? Minimum balance, specific chain activity, etc." rows={2} />
          </div>
        </div>

        {/* ── Trust & Verification ───────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <SectionHeader title="Trust & Verification" subtitle="Helps us assess legitimacy and assign a trust score" />
          <div>
            <Label text="Team Information" />
            <Textarea name="team_info" value={form.team_info} onChange={set}
              placeholder="Are founders public? Any LinkedIn / past projects / notable backers?" rows={2} />
          </div>
          <div>
            <Label text="Funding / Investors" />
            <Input name="funding_investors" value={form.funding_investors} onChange={set}
              placeholder="e.g. Raised $5M — Paradigm, a16z" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label text="Whitepaper / Docs URL" />
              <Input name="whitepaper_url" value={form.whitepaper_url} onChange={set} type="url" placeholder="https://..." />
            </div>
            <div>
              <Label text="GitHub URL" />
              <Input name="github_url" value={form.github_url} onChange={set} type="url" placeholder="https://github.com/..." />
            </div>
            <div>
              <Label text="Contract Address" />
              <Input name="contract_address" value={form.contract_address} onChange={set} placeholder="0x..." />
            </div>
            <div>
              <Label text="Audit Report URL" />
              <Input name="audit_url" value={form.audit_url} onChange={set} type="url" placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* ── Risk Assessment ────────────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-4">
          <SectionHeader title="Risk Assessment" subtitle="Answer honestly — this affects your trust score" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Toggle name="requires_wallet_connection" checked={form.requires_wallet_connection} onChange={set} label="Requires wallet connection?" />
            <Toggle name="requires_transaction" checked={form.requires_transaction} onChange={set} label="Requires on-chain transaction?" />
            <Toggle name="requires_payment" checked={form.requires_payment} onChange={set} label="Requires any payment?" />
            <Toggle name="requires_seed_phrase" checked={form.requires_seed_phrase} onChange={set} label="Requires seed phrase?" />
          </div>
          {form.requires_seed_phrase && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Warning: airdrops that require seed phrases are almost always scams and will be rejected.
            </div>
          )}
        </div>

        {/* ── Additional Notes ───────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <Label text="Additional Notes" />
          <Textarea name="additional_notes" value={form.additional_notes} onChange={set}
            placeholder="Anything else you'd like us to know..." rows={3} />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
          ) : (
            <><Send className="w-4 h-4" /> Submit for Review</>
          )}
        </button>

        <p className="text-xs text-gray-600 text-center">
          By submitting, you confirm the information provided is accurate to the best of your knowledge.
          Listings are at the sole discretion of Airdrop Guard's editorial team.
        </p>
      </form>
    </div>
  );
}

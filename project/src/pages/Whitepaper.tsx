import React from "react";
import SEO from '../components/SEO';
import { canonicalFromPath } from '../lib/seo';

type Pillar = {
  title: string;
  text: string;
};

type ComparisonRow = {
  traditional: string;
  airdropGuard: string;
};

const pillars: Pillar[] = [
  {
    title: "Intelligence",
    text: "Structured project assessments that separate project quality, airdrop certainty, security signals, evidence coverage and opportunity value.",
  },
  {
    title: "Verification",
    text: "Human analyst review sits alongside automated intelligence so listings are not published purely because a model or form produced a score.",
  },
  {
    title: "Safety",
    text: "AirdropGuard is designed around no seed phrases, no private keys, no forced wallet connections and clear risk warnings before users take action.",
  },
  {
    title: "Community",
    text: "Community Results help users understand whether participants received rewards, were not eligible, or are still waiting for outcomes.",
  },
  {
    title: "Developer Platform",
    text: "AirdropGuard data is being shaped for wallets, portfolio trackers, Telegram bots, research tools and future enterprise integrations.",
  },
];

const framework = [
  ["Project Reputation", "Legitimacy, maturity, official presence, history, brand credibility and public project quality."],
  ["Airdrop Confidence", "Evidence of an official token, campaign, snapshot, claim process, reward structure or verified eligibility route."],
  ["Security & Threat Signals", "Known scam warnings, suspicious claims, phishing exposure, official-link integrity and user-action risk."],
  ["Evidence Coverage", "Whether the listing has enough independent signals to justify confidence in the assessment."],
  ["Community & Development", "Community traction, developer presence, ecosystem activity and visible project momentum."],
  ["Timeline & Maturity", "Project milestones, launch history, funding events, major updates, token status and ongoing monitoring triggers."],
  ["Opportunity Quality", "Reward potential, effort required, time sensitivity, task complexity and likely value for users."],
  ["Analyst Verification", "Human review of automated findings before publishing, promoting, rejecting or blacklisting listings."],
];

const comparisonRows: ComparisonRow[] = [
  {
    traditional: "Lists airdrops with limited context.",
    airdropGuard: "Evaluates airdrops through structured intelligence layers.",
  },
  {
    traditional: "Often treats project quality and airdrop quality as the same thing.",
    airdropGuard: "Separates Project Reputation from Airdrop Confidence.",
  },
  {
    traditional: "Uses a single score or basic status label.",
    airdropGuard: "Shows reputation, security, evidence, threat, opportunity and final recommendation signals.",
  },
  {
    traditional: "May show token data based on ticker or name matches.",
    airdropGuard: "Shows live market data only when an official contract address is available.",
  },
  {
    traditional: "Leaves users to manually understand risk.",
    airdropGuard: "Provides user-facing explanations, missing intelligence and safety warnings.",
  },
  {
    traditional: "Focuses mainly on discovery.",
    airdropGuard: "Combines discovery, safety, tracking, community results and developer access.",
  },
];

const roadmap = [
  {
    phase: "Phase 1",
    title: "Public Intelligence Platform",
    text: "Launch verified listings, intelligence reports, human review, task tracking, community results and educational content.",
  },
  {
    phase: "Phase 2",
    title: "Developer & API Layer",
    text: "Expand API access for wallets, bots, dashboards, research platforms and partner applications.",
  },
  {
    phase: "Phase 3",
    title: "Advanced Risk Monitoring",
    text: "Strengthen threat intelligence, timeline monitoring, scam alerts, official-link checks and multi-chain signals.",
  },
  {
    phase: "Phase 4",
    title: "Consumer & Enterprise Expansion",
    text: "Develop richer dashboards, browser extension, mobile experience and enterprise intelligence products.",
  },
];

const questions = [
  "Can this project be trusted?",
  "Is there credible evidence of an airdrop?",
  "Is this opportunity worth my time today?",
];

export default function Whitepaper() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <SEO
        title="AirdropGuard Whitepaper, Trust Framework and Methodology"
        description="Read the AirdropGuard whitepaper covering intelligence methodology, trust framework, verification model, and long-term product roadmap."
        canonical={canonicalFromPath('/whitepaper')}
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              '@id': 'https://airdropguard.com/whitepaper#techarticle',
              headline: 'AirdropGuard Whitepaper',
              url: 'https://airdropguard.com/whitepaper',
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://airdropguard.com/whitepaper#breadcrumb',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airdropguard.com/' },
                { '@type': 'ListItem', position: 2, name: 'Whitepaper', item: 'https://airdropguard.com/whitepaper' },
              ],
            },
          ],
        }}
      />
      <Hero />

      <main id="whitepaper" className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        <section className="grid md:grid-cols-3 gap-6">
          <StatCard value="01" title="Security-first" text="No seed phrases, no private keys and no forced wallet connection to access research." />
          <StatCard value="02" title="Intelligence-led" text="Reports are designed to explain project quality, airdrop confidence and user risk separately." />
          <StatCard value="03" title="Human-reviewed" text="Automated intelligence supports review, but analyst verification remains central to publishing decisions." />
        </section>

        <Section eyebrow="01" title="Executive Summary">
          <p>
            AirdropGuard is building a Web3 intelligence platform for crypto airdrop discovery,
            safety and decision-making. The platform exists to help users understand not only
            which opportunities exist, but whether those opportunities are credible, safe and
            worth their time.
          </p>
          <p>
            Crypto airdrops can reward early participation, but they also attract fake campaigns,
            phishing links, impersonation accounts, wallet drainers and low-quality projects.
            AirdropGuard responds to this problem by combining structured intelligence,
            analyst verification, community signals, read-only safety tooling and developer access.
          </p>
          <p>
            The core philosophy is simple: users should be able to check before they connect.
            AirdropGuard does not provide financial advice. It provides clearer information,
            transparent risk signals and safer research workflows.
          </p>
        </Section>

        <Section eyebrow="02" title="Why AirdropGuard Exists">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <p>
                Most crypto users do not suffer from a lack of opportunities. They suffer from a
                lack of trustworthy filtering. Airdrop discovery is fragmented across social media,
                Discord servers, Telegram groups, influencer posts, spreadsheets and project websites.
              </p>
              <p>
                That fragmentation creates risk. Users are asked to connect wallets, complete tasks,
                bridge funds, sign messages, join communities or interact with contracts before they
                have enough context to judge whether the opportunity is genuine.
              </p>
              <p>
                AirdropGuard was created to turn that scattered information into structured,
                human-readable intelligence.
              </p>
            </div>
            <div className="bg-red-950/30 border border-red-900/70 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-5">The trust gap</h3>
              <ul className="space-y-4 text-gray-300">
                <Bullet>Fake airdrop claim pages and phishing domains.</Bullet>
                <Bullet>Impersonation accounts on X, Discord and Telegram.</Bullet>
                <Bullet>Projects with unclear teams, weak documentation or vague rewards.</Bullet>
                <Bullet>Time wasted farming campaigns with little evidence of future value.</Bullet>
                <Bullet>Users confusing a trusted project with a confirmed airdrop.</Bullet>
              </ul>
            </div>
          </div>
        </Section>

        <Section eyebrow="03" title="The AirdropGuard Platform">
          <p>
            AirdropGuard is organised around five strategic pillars. Together, these pillars create
            a safer research environment for users and a structured data layer for developers and partners.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5 mt-8">
            {pillars.map((pillar) => (
              <Card key={pillar.title} title={pillar.title} text={pillar.text} />
            ))}
          </div>
        </Section>

        <section className="rounded-3xl bg-gradient-to-br from-blue-950/40 via-gray-900 to-purple-950/30 border border-blue-900/40 p-8 md:p-10">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
            <div>
              <p className="text-blue-400 font-semibold mb-3">04 • Proprietary Intelligence Layer</p>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">AirdropGuard Intelligence™</h2>
              <div className="space-y-4 text-gray-300 text-lg leading-8">
                <p>
                  AirdropGuard Intelligence™ combines automated analysis, evidence validation,
                  threat detection, project signal review and analyst verification to help users
                  understand both project quality and airdrop certainty.
                </p>
                <p>
                  The system intentionally separates a project's reputation from the certainty of
                  its airdrop. A mature protocol may be highly reputable while still having no
                  confirmed token, snapshot or reward allocation. Presenting those signals separately
                  gives users a clearer basis for decision-making.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {questions.map((question, index) => (
                <div key={question} className="bg-gray-950/60 border border-white/10 rounded-2xl p-5">
                  <div className="text-blue-400 font-bold mb-2">0{index + 1}</div>
                  <div className="text-xl font-bold">{question}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Section eyebrow="05" title="The Intelligence Framework">
          <p>
            Each listing can be assessed across independent intelligence dimensions. These dimensions
            are designed to make the final assessment explainable rather than relying on a single
            opaque number.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            {framework.map(([title, text]) => (
              <FrameworkCard key={title} title={title} text={text} />
            ))}
          </div>
        </Section>

        <Section eyebrow="06" title="How Intelligence Reports Work">
          <div className="grid lg:grid-cols-4 gap-5">
            <ProcessCard step="1" title="Collect Signals" text="Official links, documentation, tasks, team data, funding, security indicators and community signals are gathered where available." />
            <ProcessCard step="2" title="Separate the Scores" text="Project Reputation, Airdrop Confidence, Security, Evidence and Opportunity are assessed independently." />
            <ProcessCard step="3" title="Explain the Findings" text="Users see plain-language context such as Project Signals, Evidence Coverage, Threat Intelligence and Final Recommendation." />
            <ProcessCard step="4" title="Review & Monitor" text="Human analysts review intelligence findings and listings can be updated as new information appears." />
          </div>
        </Section>

        <Section eyebrow="07" title="Why AirdropGuard is Different">
          <div className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900">
            <div className="grid md:grid-cols-2 bg-gray-950 text-sm uppercase tracking-wider text-gray-400">
              <div className="p-5 border-b md:border-b-0 md:border-r border-gray-800">Traditional Airdrop Sites</div>
              <div className="p-5 border-b border-gray-800 md:border-b-0 text-blue-400">AirdropGuard</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.traditional} className="grid md:grid-cols-2 border-t border-gray-800">
                <div className="p-5 text-gray-400 md:border-r border-gray-800">{row.traditional}</div>
                <div className="p-5 text-gray-200">{row.airdropGuard}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="08" title="Human Verification">
          <p>
            AirdropGuard is not designed to replace human judgement. Automated intelligence can
            collect signals, detect patterns and structure information, but human review remains
            central to verification, listing decisions and scam warnings.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card title="Verified" text="A listing has passed review and can be shown as a stronger opportunity with visible trust indicators." />
            <Card title="Under Review" text="A listing may be visible with caution while evidence, official links, tasks or reward details are still being checked." />
            <Card title="Scam Alert" text="Listings can be separated into warning areas when risk signals, impersonation or malicious behaviour are identified." />
          </div>
        </Section>

        <Section eyebrow="09" title="Security & Privacy Principles">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              "No seed phrase collection.",
              "No private key requests.",
              "Email-only signup available.",
              "No forced wallet connection to access information.",
              "Read-only wallet safety tooling focus.",
              "Official contract required before live token market data is displayed.",
              "Paid listings do not override risk warnings or analyst review.",
              "Crypto risk disclosures remain visible and clear.",
            ].map((item) => (
              <div key={item} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-gray-300">
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="10" title="Community Results">
          <p>
            Airdrop outcomes are often unclear. Community Results allow users to share whether they
            received an airdrop, were not eligible, or are still waiting. Over time, these signals can
            help users understand historical outcomes and compare campaign quality more effectively.
          </p>
        </Section>

        <Section eyebrow="11" title="Developer & API Platform">
          <div className="bg-blue-950/30 border border-blue-900 rounded-3xl p-8 md:p-10">
            <p className="text-gray-300 text-lg leading-8 mb-8">
              AirdropGuard API access is designed to let other applications use structured airdrop
              intelligence. Wallets, portfolio trackers, DeFi dashboards, Telegram bots, Discord bots,
              research tools and future enterprise systems may use AirdropGuard data to improve user safety.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "Verified listings",
                "Project reputation",
                "Airdrop confidence",
                "Threat indicators",
                "Opportunity ratings",
                "Community results",
                "Evidence coverage",
                "Scam alerts",
                "Final recommendations",
              ].map((item) => (
                <div key={item} className="bg-gray-950/50 border border-white/10 rounded-xl p-4 text-gray-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section eyebrow="12" title="Enterprise Vision">
          <p>
            AirdropGuard is being built as more than a listing website. The long-term vision is to
            become an intelligence layer for safer Web3 participation, supporting consumers,
            builders, communities and partner applications.
          </p>
          <p>
            Future enterprise use cases may include wallet risk overlays, browser extension warnings,
            portfolio intelligence, airdrop monitoring tools, exchange research integrations,
            community moderation tools and institutional research dashboards.
          </p>
        </Section>

        <Section eyebrow="13" title="Roadmap">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {roadmap.map((item) => (
              <RoadmapCard key={item.phase} phase={item.phase} title={item.title} text={item.text} />
            ))}
          </div>
        </Section>

        <section className="bg-yellow-950/40 border border-yellow-800 rounded-3xl p-8 md:p-10">
          <h2 className="text-3xl font-bold mb-4">Important Risk Disclosure</h2>
          <p className="text-gray-300 leading-8 text-lg">
            Cryptoassets are high risk. AirdropGuard provides intelligence, human review,
            safety signals and educational information only. Nothing on AirdropGuard is financial,
            legal, tax or investment advice. Verified listings, featured listings, dashboard tools,
            intelligence reports, community results and analyst review do not guarantee safety,
            rewards, profits, eligibility or future token value. Always do your own research and
            use official links before connecting a wallet.
          </p>
        </section>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-16 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Check Before You Connect.</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          The future of crypto rewards is not about chasing every opportunity. It is about understanding which opportunities deserve your attention.
        </p>
        <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-2xl text-lg font-semibold">
          Explore Live Airdrops →
        </a>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 py-28 px-6 text-center">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.25),transparent_35%)]" />
      <div className="relative max-w-5xl mx-auto">
        <p className="text-blue-400 font-semibold mb-4">Whitepaper v2.0 • June 2026</p>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          AirdropGuard Whitepaper
        </h1>
        <p className="text-2xl md:text-3xl text-gray-300 mb-5">
          Web3 Airdrop Intelligence for Safer Participation
        </p>
        <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-8">
          AirdropGuard helps users discover, evaluate and track crypto airdrops through
          structured intelligence, analyst verification, safety-first design and community-driven signals.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a href="#whitepaper" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold">
            Read Whitepaper
          </a>
          <a href="/assets/airdropguard-whitepaper.pdf" download className="border border-gray-500 hover:bg-white hover:text-gray-950 px-8 py-4 rounded-xl font-semibold">
            Download PDF
          </a>
        </div>
      </div>
    </section>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-blue-400 font-semibold mb-3">{eyebrow}</p>
      <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">{title}</h2>
      <div className="text-gray-300 text-lg leading-8 space-y-4">{children}</div>
    </section>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-900/70 transition-colors">
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-7">{text}</p>
    </div>
  );
}

function StatCard({ value, title, text }: { value: string; title: string; text: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-7">
      <div className="text-blue-400 text-sm font-bold mb-5">{value}</div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-7">{text}</p>
    </div>
  );
}

function FrameworkCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="h-1.5 w-20 bg-blue-600 rounded-full mb-5" />
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-7">{text}</p>
    </div>
  );
}

function ProcessCard({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-6">
      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold mb-5">
        {step}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-7">{text}</p>
    </div>
  );
}

function RoadmapCard({ phase, title, text }: { phase: string; title: string; text: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
      <p className="text-blue-400 font-semibold mb-3">{phase}</p>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-7">{text}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-3 h-2 w-2 rounded-full bg-red-400 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

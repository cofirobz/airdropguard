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

type WhitepaperSection = {
  id: string;
  number: string;
  title: string;
};

const whitepaperSections: WhitepaperSection[] = [
  { id: 'executive-summary', number: '01', title: 'Executive Summary' },
  { id: 'the-problem', number: '02', title: 'The Problem' },
  { id: 'our-solution', number: '03', title: 'Our Solution' },
  { id: 'platform-overview', number: '04', title: 'Platform Overview' },
  { id: 'ai-intelligence', number: '05', title: 'AI Intelligence' },
  { id: 'security-philosophy', number: '06', title: 'Security Philosophy' },
  { id: 'opportunity-intelligence', number: '07', title: 'Opportunity Intelligence' },
  { id: 'api-platform', number: '08', title: 'API Platform' },
  { id: 'roadmap', number: '09', title: 'Roadmap' },
  { id: 'methodology', number: '10', title: 'Methodology' },
  { id: 'privacy', number: '11', title: 'Privacy' },
  { id: 'conclusion', number: '12', title: 'Conclusion' },
];

const pillars: Pillar[] = [
  {
    title: "Verified Airdrops",
    text: "Listings are enriched with project context, task breakdowns, risk signals and analyst-reviewed status to reduce blind participation.",
  },
  {
    title: "Speculative Tokens",
    text: "High-interest token narratives can be tracked as speculative opportunities with explicit uncertainty signals and no implied guarantees.",
  },
  {
    title: "Scam Alerts",
    text: "Threat-focused pages isolate impersonation patterns, malicious campaigns and blacklisted activity to support safer decision workflows.",
  },
  {
    title: "Wallet Intelligence",
    text: "Read-only wallet analysis helps users inspect visible address behavior and hygiene signals before taking additional on-chain actions.",
  },
  {
    title: "AI Opportunity Intelligence",
    text: "AI-generated summaries, scoring context and copilot guidance are combined with verification controls for explainable opportunity research.",
  },
];

const framework = [
  ["Project Reputation", "Assesses legitimacy indicators such as official presence, project maturity, public track record and execution quality."],
  ["Opportunity Score", "Measures practical value relative to effort, timeline, eligibility complexity and observable reward context where available."],
  ["Airdrop Confidence", "Evaluates whether airdrop mechanics are supported by credible evidence rather than social speculation alone."],
  ["Security & Threat Signals", "Captures phishing indicators, suspicious claims, impersonation risks and link-integrity concerns."],
  ["Evidence Coverage", "Tracks whether enough independent signals exist to support a confident listing interpretation."],
  ["Community & Ecosystem", "Observes community quality, developer footprint and ecosystem-level momentum that may affect opportunity outcomes."],
  ["Timeline & Maturity", "Considers launch stage, updates, roadmap progress and lifecycle timing relevant to user participation decisions."],
  ["Analyst Verification", "Human review validates critical findings before publish-state changes, escalations or scam classifications."],
];

const comparisonRows: ComparisonRow[] = [
  {
    traditional: "Discovery-first lists with minimal verification depth.",
    airdropGuard: "Discovery plus structured intelligence and verification controls.",
  },
  {
    traditional: "Single headline score or generic status labels.",
    airdropGuard: "Separate dimensions for reputation, confidence, security and opportunity.",
  },
  {
    traditional: "Limited explanation of why an item is risky or promising.",
    airdropGuard: "Plain-language explanations and evidence-linked scoring context.",
  },
  {
    traditional: "Little separation between speculative and verified opportunities.",
    airdropGuard: "Dedicated surfaces for verified, speculative and scam-alert states.",
  },
  {
    traditional: "Risk handling delegated entirely to users.",
    airdropGuard: "Read-only wallet intelligence and safety-forward warning architecture.",
  },
  {
    traditional: "Closed data experience for builders.",
    airdropGuard: "API-ready intelligence model for developer and enterprise integrations.",
  },
];

const roadmap = [
  {
    phase: "Near-term",
    title: "AI Quality Expansion",
    text: "Improve model-assisted summarization reliability, better uncertainty signalling and stronger analyst tooling for review efficiency.",
  },
  {
    phase: "Near-term",
    title: "Broader Discovery Sources",
    text: "Increase ingestion coverage across ecosystems, campaign channels and project intelligence sources with tighter deduplication controls.",
  },
  {
    phase: "Mid-term",
    title: "Deeper Wallet Insights",
    text: "Expand read-only wallet context and address-level signal interpretation for safer participation decisions.",
  },
  {
    phase: "Mid-term",
    title: "Personalized AI and Enterprise API",
    text: "Deliver personalized research views and stronger enterprise-grade API access patterns for products, teams and partner platforms.",
  },
];

const questions = [
  "Is this opportunity credible?",
  "What is the practical risk before participation?",
  "Is the expected effort justified by available evidence?",
];

export default function Whitepaper() {
  const canonical = canonicalFromPath('/whitepaper');
  const title = 'Whitepaper: AI-Powered Crypto Opportunity Intelligence Platform';
  const description = 'AirdropGuard whitepaper outlining platform architecture, AI opportunity intelligence, methodology, security philosophy, API direction and privacy principles.';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        type="article"
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              '@id': 'https://airdropguard.com/whitepaper#techarticle',
              headline: 'AirdropGuard Whitepaper: AI-Powered Crypto Opportunity Intelligence Platform',
              description,
              url: 'https://airdropguard.com/whitepaper',
              mainEntityOfPage: 'https://airdropguard.com/whitepaper',
              datePublished: '2026-07-07',
              dateModified: '2026-07-07',
              author: {
                '@type': 'Organization',
                name: 'AirdropGuard Research Team',
              },
              publisher: {
                '@type': 'Organization',
                name: 'AirdropGuard',
                url: 'https://airdropguard.com',
              },
              about: [
                'Verified Airdrops',
                'Speculative Tokens',
                'Scam Alerts',
                'Opportunity Intelligence',
                'Wallet Intelligence',
                'Web3 Discovery Infrastructure',
              ],
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
        <section className="rounded-3xl border border-gray-800 bg-gray-900 p-6 md:p-8">
          <p className="text-sm uppercase tracking-wide text-gray-400 mb-5">Whitepaper Navigation</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {whitepaperSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-gray-300 hover:border-blue-800 hover:text-white transition-colors"
              >
                <span className="text-blue-400 text-xs font-semibold mr-2">{section.number}</span>
                {section.title}
              </a>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <StatCard value="01" title="Security-first" text="No seed phrases, no private key custody and no requirement to connect a wallet to read intelligence." />
          <StatCard value="02" title="Explainable scoring" text="Opportunity research is broken into explicit dimensions instead of a single opaque score." />
          <StatCard value="03" title="Human oversight" text="AI assists research and triage while analyst verification controls publishing and escalation states." />
        </section>

        <Section id="executive-summary" eyebrow="01" title="Executive Summary">
          <p>
            AirdropGuard is an AI-powered Crypto Opportunity Intelligence Platform built to help users discover opportunities while avoiding scams.
            The platform combines machine-assisted analysis, human verification and safety-focused product design across verified airdrops,
            speculative tokens, scam alerts, ecosystem opportunities, wallet intelligence and AI copilot workflows.
          </p>
          <p>
            The objective is operational clarity. Users should understand what is known, what remains uncertain, what risks are visible,
            and whether participation effort is proportionate to available evidence.
          </p>
          <p>
            AirdropGuard is not a token project and does not provide investment promises. It is infrastructure for safer opportunity discovery,
            transparent risk interpretation and developer integrations.
          </p>
        </Section>

        <Section id="the-problem" eyebrow="02" title="The Problem">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <p>
                Opportunity discovery in Web3 is fragmented across social channels, community forums, campaign sites and unofficial aggregators.
                The result is high signal noise and inconsistent trust standards.
              </p>
              <p>
                Users often make participation decisions with limited context on legitimacy, reward credibility, campaign quality and wallet exposure.
                This creates operational risk, time loss and avoidable scam incidents.
              </p>
              <p>
                AirdropGuard addresses this with structured intelligence designed for practical decision-making rather than hype-oriented discovery.
              </p>
            </div>
            <div className="bg-red-950/30 border border-red-900/70 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-5">Core market frictions</h3>
              <ul className="space-y-4 text-gray-300">
                <Bullet>Scam airdrop campaigns and phishing domains.</Bullet>
                <Bullet>Information overload from low-confidence opportunity noise.</Bullet>
                <Bullet>Fake or manipulated social engagement signals.</Bullet>
                <Bullet>Wallet security risks from premature interaction and blind signing.</Bullet>
                <Bullet>Poor discovery quality across high-value ecosystem opportunities.</Bullet>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="our-solution" eyebrow="03" title="Our Solution">
          <p>
            AirdropGuard provides a multi-layer solution that combines AI analysis, human verification and explicit score dimensions.
            This architecture supports both end-users and developers who need consistent opportunity intelligence.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5 mt-8">
            {pillars.map((pillar) => (
              <Card key={pillar.title} title={pillar.title} text={pillar.text} />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            <Card title="Trust Scores" text="Trust Scores consolidate legitimacy, safety and verification context into explainable user-facing confidence signals." />
            <Card title="Opportunity Scores" text="Opportunity Scores assess practical upside relative to effort, timing and available evidence quality." />
            <Card title="Discovery Engine" text="Opportunity ingestion and enrichment prioritize relevance, deduplication and stateful monitoring across evolving project lifecycles." />
            <Card title="AI Copilot + API" text="Copilot assists interpretation and action planning while API access enables integration into external products and workflows." />
          </div>
        </Section>

        <section id="platform-overview" className="rounded-3xl bg-gradient-to-br from-blue-950/40 via-gray-900 to-purple-950/30 border border-blue-900/40 p-8 md:p-10">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
            <div>
              <p className="text-blue-400 font-semibold mb-3">04 • Platform Overview</p>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Current Product Surface</h2>
              <div className="space-y-4 text-gray-300 text-lg leading-8">
                <p>
                  The platform currently includes verified opportunity listings, speculative opportunity tracking,
                  scam alert intelligence, read-only wallet analysis, educational research content and AI-assisted copilot workflows.
                </p>
                <p>
                  Opportunity pages include score context, risk narratives, evidence visibility and recommendation framing.
                  Analysts can moderate listing status while users can compare outcomes through community result data.
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

        <Section id="ai-intelligence" eyebrow="05" title="AI Intelligence">
          <p>
            AI in AirdropGuard is used to accelerate research, summarize complex context and highlight potential risk patterns.
            AI is an assistant layer, not a fully autonomous publishing authority.
          </p>
          <p>
            Model outputs are designed to improve user understanding of project signals, confidence gaps and participation tradeoffs.
            Internal prompts and implementation details are intentionally not exposed in user-facing documentation.
          </p>
          <p>
            The objective is practical clarity: faster interpretation, clearer risk framing and higher consistency across large opportunity sets.
          </p>
        </Section>

        <Section id="security-philosophy" eyebrow="06" title="Security Philosophy">
          <div className="grid md:grid-cols-2 gap-5">
            {[
              "No seed phrase collection under any platform workflow.",
              "No private key handling or wallet custody model.",
              "Read-only wallet analysis focus for safety diagnostics.",
              "Human verification remains mandatory for sensitive listing transitions.",
              "Continuous monitoring supports status updates and risk reclassification.",
              "Contract-linked market references are shown only with verified identifiers.",
              "Paid or promoted visibility cannot suppress risk indicators.",
              "Risk disclosure language remains explicit across user flows.",
            ].map((item) => (
              <div key={item} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-gray-300">
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section id="opportunity-intelligence" eyebrow="07" title="Opportunity Intelligence">
          <p>
            Opportunity intelligence follows a lifecycle model: discovery, enrichment, scoring, verification, publication and monitoring.
            This reduces stale listings and supports timely reclassification when new data appears.
          </p>
          <div className="grid lg:grid-cols-5 gap-4 mt-8">
            <ProcessCard step="1" title="Discover" text="Sources are monitored for new opportunities and ecosystem activity." />
            <ProcessCard step="2" title="Enrich" text="Project, campaign and evidence signals are normalized into structured attributes." />
            <ProcessCard step="3" title="Score" text="Trust and opportunity dimensions are calculated with uncertainty awareness." />
            <ProcessCard step="4" title="Review" text="Analysts validate high-impact findings and state transitions." />
            <ProcessCard step="5" title="Monitor" text="Listings are continuously checked for status drift and new risk signals." />
          </div>
        </Section>

        <Section id="api-platform" eyebrow="08" title="API Platform">
          <p>
            AirdropGuard API capabilities are designed for developers building wallets, analytics products,
            automation tools and safety overlays that require structured opportunity intelligence.
          </p>
          <div className="bg-blue-950/30 border border-blue-900 rounded-3xl p-8 md:p-10 mt-8">
            <p className="text-gray-300 text-lg leading-8 mb-8">
              API design priorities include stable resource structure, explicit field semantics, practical filtering,
              and integration-safe metadata that can support both consumer applications and enterprise workflows.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "Verified listings and states",
                "Scam alert intelligence",
                "Speculative opportunity streams",
                "Trust and opportunity dimensions",
                "Evidence and confidence fields",
                "Community outcome context",
                "Timeline and monitoring metadata",
                "Risk-facing recommendation signals",
                "Integration-friendly canonical links",
              ].map((item) => (
                <div key={item} className="bg-gray-950/50 border border-white/10 rounded-xl p-4 text-gray-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="roadmap" eyebrow="09" title="Roadmap">
          <p>
            The roadmap is intentionally realistic and focused on measurable quality improvements rather than speculative expansion claims.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {roadmap.map((item) => (
              <RoadmapCard key={item.title} phase={item.phase} title={item.title} text={item.text} />
            ))}
          </div>
        </Section>

        <Section id="methodology" eyebrow="10" title="Methodology">
          <p>
            Scores are produced through a weighted multi-signal framework that separates legitimacy, confidence, security and opportunity context.
            This prevents over-reliance on any single signal source.
          </p>
          <p>
            Methodology design emphasizes explainability, consistent definitions and visible evidence boundaries.
            When evidence is insufficient, confidence indicators remain conservative.
          </p>
          <p>
            Human analysts can override or escalate states where model output lacks reliability,
            preserving platform integrity over automation speed.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            {framework.map(([title, text]) => (
              <FrameworkCard key={title} title={title} text={text} />
            ))}
          </div>
        </Section>

        <Section id="privacy" eyebrow="11" title="Privacy">
          <p>
            Privacy design is aligned with a safety-first research model: users can access substantial platform intelligence without surrendering sensitive credentials.
            Data collection is scoped to product operation, abuse prevention and service quality improvement.
          </p>
          <p>
            Wallet intelligence features are read-only by design and are intended for visible-address interpretation,
            not custody, key storage or private transaction control.
          </p>
          <p>
            Platform policy commitments are supported through clear user-facing legal and risk documentation.
          </p>
        </Section>

        <Section id="conclusion" eyebrow="12" title="Conclusion">
          <p>
            AirdropGuard is building infrastructure for safer Web3 opportunity participation.
            The platform focus is practical: discover faster, evaluate better and reduce preventable scam exposure.
          </p>
          <p>
            By combining AI assistance, human verification, structured scoring and developer-accessible intelligence,
            AirdropGuard aims to improve decision quality for both individual users and integrated products.
          </p>
        </Section>

        <Section eyebrow="Appendix" title="Positioning Snapshot">
          <div className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900">
            <div className="grid md:grid-cols-2 bg-gray-950 text-sm uppercase tracking-wider text-gray-400">
              <div className="p-5 border-b md:border-b-0 md:border-r border-gray-800">Conventional Opportunity Aggregators</div>
              <div className="p-5 border-b border-gray-800 md:border-b-0 text-blue-400">AirdropGuard Intelligence Platform</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.traditional} className="grid md:grid-cols-2 border-t border-gray-800">
                <div className="p-5 text-gray-400 md:border-r border-gray-800">{row.traditional}</div>
                <div className="p-5 text-gray-200">{row.airdropGuard}</div>
              </div>
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
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Helping Users Discover Opportunities While Avoiding Scams.</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          AirdropGuard is focused on long-term intelligence quality, transparent methodology and safer participation infrastructure for Web3 users and builders.
        </p>
        <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-2xl text-lg font-semibold">
          Explore the Platform →
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
        <p className="text-blue-400 font-semibold mb-4">Whitepaper v3.0 • July 2026</p>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          AirdropGuard Whitepaper
        </h1>
        <p className="text-2xl md:text-3xl text-gray-300 mb-5">
          AI-Powered Crypto Opportunity Intelligence Platform
        </p>
        <p className="max-w-3xl mx-auto text-gray-400 text-lg leading-8">
          A professional framework for discovering, researching and evaluating verified airdrops,
          speculative tokens, scam alerts, ecosystem opportunities, wallet intelligence and AI-assisted decisions.
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
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
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

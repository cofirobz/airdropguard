import { Shield, AlertTriangle, Bot, Scale, Mail } from 'lucide-react';

const EFFECTIVE_DATE = 'June 17, 2025';
const LAST_UPDATED   = 'June 17, 2025';
const CONTACT_EMAIL  = 'cofirobz@googlemail.com';
const SITE_URL       = 'https://airdropguard.com';

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function Section({ id, title, children, icon, highlight }: SectionProps) {
  return (
    <section id={id} className={`glass-card p-6 sm:p-8 ${highlight ? 'border border-rose-500/20' : ''}`}>
      <div className="flex items-start gap-3 mb-4">
        {icon && (
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${highlight ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-gray-400'}`}>
            {icon}
          </div>
        )}
        <h2 className={`text-lg font-semibold ${highlight ? 'text-rose-300' : 'text-white'}`}>{title}</h2>
      </div>
      <div className="prose-sm text-gray-400 leading-relaxed space-y-3 pl-11">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-neon-purple" />
          </div>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        </div>
        <p className="text-sm text-gray-500">
          Effective: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-3 text-sm text-gray-400">
          Please read these Terms of Service carefully before using <span className="text-white">{SITE_URL}</span>. By accessing or using Airdrop Guard you agree to be bound by these terms.
        </p>
      </div>

      {/* Table of contents */}
      <div className="glass-card p-5 mb-8 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</p>
        <ol className="space-y-1.5 list-decimal list-inside text-gray-400">
          {[
            ['acceptance',    'Acceptance of Terms'],
            ['service',       'Description of Service'],
            ['eligibility',   'Eligibility'],
            ['use',           'Permitted Use'],
            ['ai-restriction','AI Training and Automated Scraping Restrictions'],
            ['disclaimer',    'Disclaimers'],
            ['liability',     'Limitation of Liability'],
            ['ip',            'Intellectual Property'],
            ['termination',   'Termination'],
            ['governing',     'Governing Law'],
            ['changes',       'Changes to These Terms'],
            ['contact',       'Contact'],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="hover:text-white transition-colors">{label}</a>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-5">

        {/* 1. Acceptance */}
        <Section id="acceptance" title="1. Acceptance of Terms" icon={<Shield className="w-4 h-4" />}>
          <p>
            By accessing or using Airdrop Guard (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) at{' '}
            <a href={SITE_URL} className="text-neon-purple hover:underline">{SITE_URL}</a>, you confirm that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use the Service.
          </p>
        </Section>

        {/* 2. Description */}
        <Section id="service" title="2. Description of Service">
          <p>
            Airdrop Guard is an information platform that aggregates, analyzes, and presents data about cryptocurrency airdrops. We provide trust scoring, risk analysis, project details, and related educational content to help users make informed decisions. We do not execute transactions, manage wallets, or provide financial services.
          </p>
        </Section>

        {/* 3. Eligibility */}
        <Section id="eligibility" title="3. Eligibility">
          <p>
            You must be at least 18 years of age to use the Service. By using the Service you represent that you meet this requirement and that your use complies with all laws and regulations applicable in your jurisdiction. The Service is not available where prohibited by law.
          </p>
        </Section>

        {/* 4. Permitted Use */}
        <Section id="use" title="4. Permitted Use">
          <p>You may use the Service for personal, non-commercial research and information purposes. You agree not to:</p>
          <ul className="list-disc list-outside ml-4 space-y-1.5">
            <li>Reproduce, republish, or redistribute content without attribution and a link to the original source.</li>
            <li>Use the Service to build a competing product or service.</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
            <li>Transmit malware, spam, or any harmful content.</li>
            <li>Circumvent or interfere with any security, rate-limiting, or access-control measures.</li>
          </ul>
        </Section>

        {/* 5. AI RESTRICTION — highlighted */}
        <Section
          id="ai-restriction"
          title="5. AI Training and Automated Scraping Restrictions"
          icon={<Bot className="w-4 h-4" />}
          highlight
        >
          <p>
            All content, data, trust scores, analyses, descriptions, and any other material published on or via Airdrop Guard (collectively, &ldquo;Content&rdquo;) are proprietary to Airdrop Guard and its licensors. The following activities are <strong className="text-rose-300">strictly prohibited</strong> without prior written permission from Airdrop Guard:
          </p>

          <ul className="list-disc list-outside ml-4 space-y-2 text-gray-300">
            <li>
              <strong>AI and Machine Learning Training.</strong> Using any Content to train, fine-tune, pre-train, or otherwise develop any artificial intelligence model, large language model, machine learning system, neural network, or similar technology, whether commercial or non-commercial.
            </li>
            <li>
              <strong>Dataset and Corpus Creation.</strong> Compiling, extracting, or incorporating Content into any dataset, training corpus, benchmark, or evaluation set, whether for internal use or third-party distribution.
            </li>
            <li>
              <strong>Automated Scraping and Harvesting.</strong> Using bots, spiders, crawlers, scrapers, or any automated means to systematically access, download, copy, or monitor Content, except where expressly authorised by our{' '}
              <a href="/api-docs" className="text-rose-400 hover:underline">public API</a>{' '}
              under the applicable API terms.
            </li>
            <li>
              <strong>Commercial Data Extraction.</strong> Extracting, re-selling, licensing, or otherwise commercially exploiting Content without a separate written data-licensing agreement with Airdrop Guard.
            </li>
            <li>
              <strong>Inference or Distillation.</strong> Using outputs generated by interacting with the Service to train or improve any AI or ML model through knowledge distillation, synthetic data generation, or similar techniques.
            </li>
          </ul>

          <p>
            This prohibition applies regardless of the technical means used and regardless of whether the data is publicly accessible. The presence of Content in publicly indexable pages does not constitute permission for the above uses.
          </p>

          <p className="text-rose-400 text-xs font-medium">
            Violation of this section may result in immediate account termination, IP blocking, and legal action including claims for damages and injunctive relief.
          </p>

          <p>
            To request a data-licensing agreement or ask about permitted use cases, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-rose-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        {/* 6. Disclaimers */}
        <Section id="disclaimer" title="6. Disclaimers" icon={<AlertTriangle className="w-4 h-4" />}>
          <p>
            <strong className="text-white">Not Financial Advice.</strong> Content on the Service is provided for informational purposes only and does not constitute financial, investment, legal, or tax advice. Trust scores and risk ratings are automated assessments based on publicly available signals and should not be relied upon as the sole basis for any financial decision.
          </p>
          <p>
            <strong className="text-white">No Warranty.</strong> The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind. We do not guarantee the accuracy, completeness, or timeliness of any Content. Cryptocurrency airdrops are inherently risky; always conduct your own due diligence (DYOR) before connecting a wallet or participating in any airdrop.
          </p>
        </Section>

        {/* 7. Liability */}
        <Section id="liability" title="7. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Airdrop Guard and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of funds, loss of data, or loss of profits, arising out of or in connection with your use of the Service or your participation in any airdrop listed on or analysed by the Service.
          </p>
        </Section>

        {/* 8. IP */}
        <Section id="ip" title="8. Intellectual Property">
          <p>
            All trademarks, logos, brand names, trust scoring algorithms, and original Content are the exclusive property of Airdrop Guard or its licensors. You may not use, copy, or reproduce any of the foregoing without prior written consent. Project logos and third-party trademarks remain the property of their respective owners and are used solely for identification purposes.
          </p>
        </Section>

        {/* 9. Termination */}
        <Section id="termination" title="9. Termination">
          <p>
            We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for any conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason in our sole discretion.
          </p>
        </Section>

        {/* 10. Governing Law */}
        <Section id="governing" title="10. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising out of or in connection with these Terms that cannot be resolved amicably shall be subject to the exclusive jurisdiction of the relevant courts.
          </p>
        </Section>

        {/* 11. Changes */}
        <Section id="changes" title="11. Changes to These Terms">
          <p>
            We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent revision. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.
          </p>
        </Section>

        {/* 12. Contact */}
        <Section id="contact" title="12. Contact" icon={<Mail className="w-4 h-4" />}>
          <p>
            Questions about these Terms, requests for data-licensing agreements, or reports of violations may be sent to:
          </p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-neon-purple hover:text-neon-purple/80 transition-colors font-medium"
            >
              <Mail className="w-4 h-4" />
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

      </div>
    </div>
  );
}

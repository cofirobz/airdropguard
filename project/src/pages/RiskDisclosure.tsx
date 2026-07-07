import SEO from '../components/SEO';
import { canonicalFromPath } from '../lib/seo';

export default function RiskDisclosure() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <SEO
        title="Crypto Risk Disclosure and Safety Notice | AirdropGuard"
        description="Understand cryptoasset risks, wallet safety limitations, and important disclaimers before using AirdropGuard research and listings."
        canonical={canonicalFromPath('/risk-disclosure')}
        schema={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': 'https://airdropguard.com/risk-disclosure#webpage',
              name: 'AirdropGuard Risk Disclosure',
              url: 'https://airdropguard.com/risk-disclosure',
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://airdropguard.com/risk-disclosure#breadcrumb',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airdropguard.com/' },
                { '@type': 'ListItem', position: 2, name: 'Risk Disclosure', item: 'https://airdropguard.com/risk-disclosure' },
              ],
            },
          ],
        }}
      />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          Risk Disclosure
        </h1>

        <p className="text-slate-300 mb-6">
          AirdropGuard is a crypto security, research and educational platform.
          We provide AI analysis, human review signals, trust scores and safety
          information to help users assess crypto airdrops and Web3 projects.
        </p>

        <section className="space-y-5 text-slate-300 leading-7">
          <p>
            Cryptoassets are high risk. Their value can rise or fall quickly,
            and you could lose all money or assets you choose to use, claim,
            bridge, swap, stake or invest.
          </p>

          <p>
            Nothing on AirdropGuard is financial advice, investment advice,
            legal advice, tax advice or a recommendation to buy, sell, hold,
            claim or participate in any cryptoasset, token, airdrop or Web3
            project.
          </p>

          <p>
            Our AI scores, trust ratings, project reviews and human checks are
            based on available information at the time of review. They are
            opinions and risk indicators only. They are not guarantees that a
            project is safe, legitimate, profitable or suitable for you.
          </p>

          <p>
            AirdropGuard does not guarantee rewards, token allocations,
            eligibility, future price, project performance or protection from
            loss, scams, hacks, phishing websites, malicious contracts or user
            error.
          </p>

          <p>
            Never share your seed phrase, private keys, passwords or recovery
            phrase with anyone. AirdropGuard will never ask you to connect a
            wallet to claim rewards and will never ask for your seed phrase.
          </p>

          <p>
            Before participating in any crypto project, you should do your own
            research, verify official links, check smart contracts, review
            project documentation and only use funds you can afford to lose.
          </p>
        </section>

        <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-red-200 font-semibold">
            Important: If something goes wrong with a cryptoasset or Web3
            project, you may not be protected by the Financial Services
            Compensation Scheme or the Financial Ombudsman Service.
          </p>
        </div>
      </div>
    </main>
  );
}

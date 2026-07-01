INSERT INTO airdrops (
  slug, name, ticker, logo_url, blockchain, category,
  reward_potential, difficulty, time_required, expiry_date,
  risk_level, status, ai_summary, ai_risk_analysis, ai_reward_estimate,
  overview, why_airdrop, estimated_reward, website_url, twitter_url,
  discord_url, telegram_url, github_url, contract_address,
  is_trending, is_featured, is_sponsored, published, sort_order
) VALUES

-- 1. Blast
(
  'blast', 'Blast', 'BLAST', 'https://assets.coingecko.com/coins/images/35494/large/blast.jpeg',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2']::category[],
  'High', 'Easy', '15 min', '2026-09-30',
  'Low', 'Active',
  'Blast is the only Ethereum L2 with native yield for ETH and stablecoins, offering 4% APY on bridged ETH and 5% on stablecoins via T-bills.',
  'Low risk profile with Paradigm and Standard Crypto backing. Smart contract audited by Spearbit. Main risk is smart contract exposure from the native yield mechanism.',
  'Estimated $200–$800 per eligible wallet based on bridge volume and early user tiers.',
  'Blast is an EVM-compatible Layer 2 that automatically earns native yield on bridged assets. Builders and users earn through Blast Points and Blast Gold allocation.',
  'Blast is rewarding early bridge users and developers with a retroactive BLAST airdrop weighted by on-chain activity and points earned during the testnet and mainnet phases.',
  '$200–$800', 'https://blast.io', 'https://twitter.com/blast_l2',
  'https://discord.gg/blast-l2', '', 'https://github.com/blast-io',
  '', true, false, false, true, 14
),

-- 2. io.net
(
  'io-net', 'io.net', 'IO', 'https://assets.coingecko.com/coins/images/36103/large/io_net.jpg',
  ARRAY['Solana']::blockchain[], ARRAY['Infrastructure']::category[],
  'High', 'Moderate', '30 min', '2026-10-15',
  'Medium', 'Active',
  'io.net is a decentralized GPU network aggregating idle compute from data centers and crypto miners to supply affordable AI/ML infrastructure at 90% lower cost than AWS.',
  'Medium risk due to early-stage infrastructure play. Revenue model depends on AI compute demand. Token inflation schedule is aggressive in year 1; team holds 15% with 2-year vesting.',
  'Estimated $300–$1,200 per node operator or early user based on compute contribution and IO Points earned.',
  'io.net aggregates millions of GPUs from underutilized sources into a decentralized supercluster. It enables AI startups to access GPU compute at a fraction of centralized cloud costs.',
  'IO rewards early GPU suppliers, app developers, and active community members with IO Points that convert directly to IO tokens at TGE.',
  '$300–$1,200', 'https://io.net', 'https://twitter.com/ionet',
  'https://discord.gg/ionet', '', 'https://github.com/ionet-official',
  '', true, false, false, true, 15
),

-- 3. Grass
(
  'grass', 'Grass', 'GRASS', 'https://assets.coingecko.com/coins/images/38959/large/grass.png',
  ARRAY['Solana']::blockchain[], ARRAY['Infrastructure']::category[],
  'Medium', 'Easy', '5 min', '2026-11-01',
  'Low', 'Active',
  'Grass is a decentralized data layer that lets users sell unused internet bandwidth to AI companies, earning GRASS tokens passively with zero technical setup.',
  'Low risk: simple browser-extension model. Primary risk is bandwidth misuse policy and compliance in restricted jurisdictions.',
  'Estimated $100–$500 per active node based on uptime and bandwidth contributed over the epoch.',
  'Grass turns idle internet bandwidth into a revenue stream. Users install a lightweight browser extension and Grass routes web-scraping traffic through their connection, compensating them in GRASS tokens.',
  'Grass distributed Season 1 rewards retroactively and is running Season 2 with multipliers for long-running nodes and referrals.',
  '$100–$500', 'https://getgrass.io', 'https://twitter.com/getgrass_io',
  'https://discord.gg/grass', '', '',
  '', false, false, false, true, 16
),

-- 4. Pendle
(
  'pendle', 'Pendle', 'PENDLE', 'https://assets.coingecko.com/coins/images/25143/large/Pendle_Logo_Normal-03.png',
  ARRAY['Ethereum', 'Arbitrum']::blockchain[], ARRAY['DeFi']::category[],
  'Medium', 'Hard', '45 min', '2026-08-31',
  'Medium', 'Active',
  'Pendle is a yield-trading protocol with $3B+ TVL, allowing users to split and trade future yield from LSTs, stablecoins, and RWAs through a novel AMM.',
  'Medium risk due to complexity of yield tokenization mechanics. Smart contracts audited by Ackee and code4rena. Liquidity can be thin for new pools; impermanent loss risk on PT/YT AMM positions.',
  'Estimated $150–$600 per LP based on vePENDLE holdings and pool interaction over the incentive period.',
  'Pendle splits yield-bearing tokens into Principal Tokens and Yield Tokens, enabling fixed-yield strategies or leveraged yield speculation without liquidation risk.',
  'Pendle regularly runs liquidity mining campaigns on new pools. Active LPs and vePENDLE voters earn boosted PENDLE emissions plus protocol fees.',
  '$150–$600', 'https://pendle.finance', 'https://twitter.com/pendle_fi',
  'https://discord.gg/pendle', '', 'https://github.com/pendle-finance',
  '', false, false, false, true, 17
),

-- 5. Dymension
(
  'dymension', 'Dymension', 'DYM', 'https://assets.coingecko.com/coins/images/33813/large/dymension.png',
  ARRAY['Cosmos']::blockchain[], ARRAY['Layer 2', 'Infrastructure']::category[],
  'High', 'Moderate', '30 min', '2026-09-15',
  'Low', 'Active',
  'Dymension is a modular blockchain ecosystem that deploys and connects rollups (RollApps) using its own settlement layer, with $200M+ in DYM staking.',
  'Low risk with strong Cosmos ecosystem backing. Validator concentration moderate; top 20 validators hold ~55% of stake. IBC bridge risk applies to cross-chain transfers.',
  'Estimated $200–$900 based on staking amount, RollApp interaction, and Froopyland testnet participation.',
  'Dymension acts as a settlement hub for modular RollApps. Developers deploy sovereign rollups with shared security, and users interact across the ecosystem via IBC.',
  'DYM rewards early stakers, IBC users, and RollApp testers via its multi-season airdrop program targeting active Cosmos and Ethereum addresses.',
  '$200–$900', 'https://dymension.xyz', 'https://twitter.com/dymension',
  'https://discord.gg/dymension', '', 'https://github.com/dymensionxyz',
  '', true, false, false, true, 18
),

-- 6. Initia
(
  'initia', 'Initia', 'INIT', '',
  ARRAY['Cosmos']::blockchain[], ARRAY['Layer 2', 'Infrastructure']::category[],
  'High', 'Moderate', '40 min', '2026-10-31',
  'Low', 'Active',
  'Initia is an interwoven L1 + L2 ecosystem on Cosmos SDK where each Minitia (app-chain) shares liquidity and security with the L1 via native enshrined liquidity.',
  'Low risk: backed by Binance Labs, Delphi Digital, and Hack VC. Network is pre-mainnet; main risk is launch delay. Token vesting schedules not yet fully disclosed.',
  'Estimated $300–$1,500 based on testnet points, Galxe quest completion, and early Minitia deployments.',
  'Initia provides unified infrastructure for launching interconnected app-chains (Minitias) with shared economic security, cross-chain messaging, and native stablecoin integration.',
  'Initia rewards testnet participants, OG community members, and builders who engaged with the ecosystem before mainnet launch.',
  '$300–$1,500', 'https://initia.xyz', 'https://twitter.com/initia',
  'https://discord.gg/initia', '', 'https://github.com/initia-labs',
  '', true, true, false, true, 19
),

-- 7. Kaito
(
  'kaito', 'Kaito', 'KAITO', '',
  ARRAY['Ethereum']::blockchain[], ARRAY['Social', 'Infrastructure']::category[],
  'Medium', 'Easy', '20 min', '2026-09-01',
  'Low', 'Active',
  'Kaito is an AI-powered Web3 search and intelligence platform with $53M raised, aggregating on-chain and social signals into Yaps — a social capital score for crypto.',
  'Low risk with reputable backers including Sequoia and Superscrypt. Token is live and trading. Main risk is reliance on Twitter/X API access and platform policy changes.',
  'Estimated $100–$800 based on Yap score ranking, early search usage, and InfoFi participation.',
  'Kaito aggregates crypto intelligence across Twitter, Discord, Telegram, and on-chain data into a unified search layer. Its Yaps system ranks crypto voices by attention and signal quality.',
  'Kaito distributes KAITO to high-scoring Yap earners and early platform users who contributed quality signal to the ecosystem.',
  '$100–$800', 'https://kaito.ai', 'https://twitter.com/KaitoAI',
  'https://discord.gg/kaitoai', '', '',
  '', false, false, false, true, 20
),

-- 8. Zircuit
(
  'zircuit', 'Zircuit', 'ZRC', '',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2']::category[],
  'High', 'Easy', '15 min', '2026-11-30',
  'Low', 'Active',
  'Zircuit is a ZK rollup with AI-enabled sequencer-level security that quarantines malicious transactions before they land on-chain, protecting users from MEV and exploits.',
  'Low risk: audited by Veridise and Spearbit, backed by Dragonfly and Pantera. Token not yet launched. Sequencer is currently centralized — standard pre-decentralization risk for ZK L2s.',
  'Estimated $400–$2,000 per wallet based on bridged ETH/LRT value and on-chain activity points accumulated.',
  'Zircuit is an EVM-compatible ZK rollup embedding security at the sequencer level. AI models screen transactions for exploit patterns before block inclusion.',
  'Zircuit Season 1 and 2 staking campaigns let users earn ZRC points by bridging LSTs, LRTs, and ETH, rewarding early depositors with retroactive token allocations.',
  '$400–$2,000', 'https://www.zircuit.com', 'https://twitter.com/ZircuitL2',
  'https://discord.gg/zircuit', '', '',
  '', true, false, false, true, 21
),

-- 9. Plume Network
(
  'plume-network', 'Plume Network', 'PLUME', '',
  ARRAY['Ethereum']::blockchain[], ARRAY['Infrastructure', 'DeFi']::category[],
  'High', 'Easy', '20 min', '2026-12-31',
  'Medium', 'Active',
  'Plume is the first modular RWA blockchain, providing native tokenization infrastructure for private credit, real estate, and commodities with DeFi composability.',
  'Medium risk: RWA tokenization faces evolving regulatory scrutiny. Token not yet launched; team composition and vesting schedules TBA.',
  'Estimated $200–$1,000 per early user based on testnet tasks, RWA interaction, and community tier.',
  'Plume Network provides full-stack tokenization infrastructure for real-world assets, including legal wrappers, KYC rails, and DeFi composability for previously illiquid assets.',
  'Plume rewards early testnet users, RWA protocol testers, and community contributors ahead of its mainnet launch and TGE.',
  '$200–$1,000', 'https://plumenetwork.xyz', 'https://twitter.com/plumenetwork',
  'https://discord.gg/plumenetwork', '', '',
  '', false, false, false, true, 22
),

-- 10. Fuel Network
(
  'fuel-network', 'Fuel Network', 'FUEL', '',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2', 'Infrastructure']::category[],
  'High', 'Hard', '60 min', '2026-10-01',
  'Medium', 'Active',
  'Fuel is the fastest modular execution layer with parallel transaction execution and its own UTXO-based FuelVM, targeting 10,000+ TPS on Ethereum with $80M raised.',
  'Medium risk: custom FuelVM and Sway language create a developer learning curve, limiting ecosystem growth speed. Backed by Blockchain Capital and CoinFund.',
  'Estimated $500–$3,000 for developers and testers based on Fuel Ignition mainnet interaction and testnet contributions.',
  'Fuel leverages a UTXO model and purpose-built FuelVM to enable native parallel transaction processing, dramatically increasing throughput without sacrificing decentralization.',
  'Fuel rewards early builders and testnet users through its FUEL token airdrop targeting wallets that deployed contracts, ran nodes, or completed on-chain tasks on Fuel Ignition.',
  '$500–$3,000', 'https://fuel.network', 'https://twitter.com/fuel_network',
  'https://discord.gg/fuelnetwork', '', 'https://github.com/FuelLabs',
  '', false, false, false, true, 23
),

-- 11. Sophon
(
  'sophon', 'Sophon', 'SOPH', '',
  ARRAY['Ethereum', 'zkSync']::blockchain[], ARRAY['Gaming', 'Social']::category[],
  'Medium', 'Easy', '15 min', '2026-09-30',
  'Low', 'Active',
  'Sophon is a consumer-focused ZK Stack chain with $60M raised, designed for gaming and social apps with gasless UX, account abstraction, and native yield on staked ETH.',
  'Low risk with backing from Mechanism Capital and Paper Ventures. Smart contract stack inherited from ZK Stack. Main risk is early-stage gaming ecosystem adoption.',
  'Estimated $150–$700 per eligible address based on node license ownership, farming activity, and ecosystem engagement.',
  'Sophon is built on ZK Stack to enable seamless Web3 consumer apps, particularly gaming and social. Native ETH yield and gasless transactions remove typical blockchain UX friction.',
  'Sophon distributed SOPH to node license holders and active farmers through its pre-launch farming season, with additional allocations for long-term ecosystem participants.',
  '$150–$700', 'https://sophon.xyz', 'https://twitter.com/sophon',
  'https://discord.gg/sophon', '', '',
  '', false, false, false, true, 24
),

-- 12. Symbiotic
(
  'symbiotic', 'Symbiotic', 'SYM', '',
  ARRAY['Ethereum']::blockchain[], ARRAY['DeFi', 'Infrastructure']::category[],
  'High', 'Moderate', '30 min', '2026-10-31',
  'Low', 'Active',
  'Symbiotic is a shared security protocol backed by Paradigm, letting any asset be used as economic security for networks — a direct EigenLayer rival with $1B+ restaked.',
  'Low risk: backed by Paradigm. No token yet (prime airdrop opportunity). Vault caps frequently hit; late depositors may miss higher-tier allocations.',
  'Estimated $500–$5,000 per wallet based on restaked amount, vault tier, and duration — one of the most anticipated TGEs of 2025.',
  'Symbiotic enables protocols to bootstrap economic security using any ERC-20 token as collateral. It offers more flexible collateral options than EigenLayer and supports multi-network security sharing.',
  'Symbiotic has no token yet, making this a prime retroactive airdrop opportunity. Points earned through restaking and vault participation will determine final SYM allocations.',
  '$500–$5,000', 'https://symbiotic.fi', 'https://twitter.com/symbioticfi',
  'https://discord.gg/symbioticfi', '', 'https://github.com/symbioticfi',
  '', true, false, false, true, 25
);

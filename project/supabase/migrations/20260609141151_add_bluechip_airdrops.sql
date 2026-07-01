
INSERT INTO airdrops (
  slug, name, logo_url, blockchain, category,
  reward_potential, difficulty, time_required, expiry_date,
  risk_level, status, is_trending, is_featured, sort_order,
  ai_summary, ai_risk_analysis, ai_reward_estimate,
  overview, why_airdrop, estimated_reward,
  website_url, twitter_url, discord_url, telegram_url, github_url
) VALUES

-- Berachain
(
  'berachain', 'Berachain', 'https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2','DeFi']::category[],
  'High', 'Moderate', '20–40 min/week', '2026-09-30',
  'Low', 'Active', true, true, 1,
  'Berachain is a high-performance EVM-compatible L1 built on Proof-of-Liquidity — a novel consensus mechanism where validators must provide liquidity to the protocol. With $100M+ raised and a thriving testnet, Berachain''s native token BERA is one of the most anticipated drops of the cycle.',
  'Berachain is backed by Polychain, OKX Ventures, and Hack VC. Proof-of-Liquidity aligns validator incentives with protocol liquidity, reducing vampire attack risk. Mainnet launched in February 2025 with strong developer activity. Smart contract risk exists as with any new L1.',
  'Testnet participants and liquidity providers are the primary eligible cohort. Based on comparable L1 launches (Aptos: $1,000–$10,000, Sui: $500–$5,000), active Berachain testnet users can expect $300–$3,000 depending on activity depth and loyalty NFT holdings.',
  'Berachain is an EVM-identical Layer 1 blockchain built on Proof-of-Liquidity (PoL), a novel consensus mechanism that requires validators to also be liquidity providers. This creates a self-reinforcing flywheel: more validators means more liquidity, which attracts more DeFi protocols, which increases validator rewards.',
  'Berachain is one of the most hyped upcoming L1s in the market. The Proof-of-Liquidity model is genuinely innovative and directly rewards protocol participants. Multiple DeFi protocols are already live on testnet, and the team has a strong track record. Getting in early maximises your eligibility across multiple potential drops.',
  '$300 – $3,000+',
  'https://berachain.com', 'https://twitter.com/berachain', 'https://discord.gg/berachain', 'https://t.me/berachain_official', 'https://github.com/berachain'
),

-- Monad
(
  'monad', 'Monad', 'https://images.pexels.com/photos/8370762/pexels-photo-8370762.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2','Infrastructure']::category[],
  'High', 'Easy', '10–20 min/week', '2026-12-31',
  'Low', 'Active', true, false, 2,
  'Monad is a high-performance EVM blockchain capable of 10,000 TPS with 1-second finality — achieved through parallel execution and a custom execution layer. Backed by Dragonfly Capital with $225M raised, Monad is expected to be the fastest EVM chain at launch and is a top airdrop candidate for 2026.',
  'Monad is backed by top-tier VCs including Dragonfly, Multicoin, and Paradigm. The technical claims of 10,000 TPS have been verified in private testnet. Risk is primarily timing — mainnet date has slipped before. No smart contract risk for simple testnet interactions.',
  'Monad has not announced tokenomics yet. Given its $225M raise and Dragonfly backing, this is a high-conviction airdrop. Conservative estimate for active testnet users: $500–$5,000. Early Discord members and NFT holders may receive bonus allocation.',
  'Monad is a Layer 1 blockchain that achieves EVM compatibility while delivering 10,000 transactions per second through MonadBFT consensus, parallel execution, and optimistic concurrency control. It runs standard Ethereum bytecode, meaning all existing Solidity contracts deploy without modification.',
  'Monad has quietly become the most anticipated blockchain of 2026. The technical execution is real — not marketing — and the team (ex-Jump Trading, ex-DE Shaw) has deep expertise. Being active on testnet and in Discord puts you in position for one of the largest potential allocations this year.',
  '$500 – $5,000+',
  'https://monad.xyz', 'https://twitter.com/monad_xyz', 'https://discord.gg/monad', '', 'https://github.com/monad-labs'
),

-- Babylon
(
  'babylon', 'Babylon', 'https://images.pexels.com/photos/8370784/pexels-photo-8370784.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum','Cosmos']::blockchain[], ARRAY['DeFi','Infrastructure']::category[],
  'High', 'Moderate', '15–30 min/week', '2026-10-15',
  'Low', 'Active', true, false, 3,
  'Babylon brings Bitcoin''s $1T+ security to proof-of-stake chains via its trustless BTC staking protocol. Raised $70M Series A led by Paradigm. Phase 1 staking cap filled in under 6 hours with $1B+ in BTC staked. BABY token airdrop confirmed for early stakers and protocol participants.',
  'Paradigm-backed with strong cryptographic security model. Bitcoin staking is non-custodial — your BTC never leaves your wallet. Main risk: new cryptographic primitives (EOTS) have not been battle-tested at scale. BTC staking yield is low (~3% APY) so opportunity cost is real.',
  'BABY token airdrop confirmed. Staking Phase 1 participants are getting a guaranteed allocation. Based on staked BTC amount and duration: small stakers (0.01 BTC) can expect $200–$1,000; large stakers (1+ BTC) may receive $5,000+. Cap phase participants get bonus multiplier.',
  'Babylon is a Bitcoin staking protocol that enables BTC holders to stake their bitcoin to provide economic security to other Proof-of-Stake blockchains — without bridges or wrapping. Using Extractable One-Time Signatures (EOTS), BTC can be slashed if a validator misbehaves, creating real cryptoeconomic security.',
  'Bitcoin staking is the next major narrative. Babylon lets you earn yield on your BTC while contributing to a genuinely novel protocol. The Paradigm backing and $1B TVL in Phase 1 validate the demand. BABY token is confirmed and early participants are explicitly prioritised in the distribution.',
  '$200 – $5,000+',
  'https://babylonlabs.io', 'https://twitter.com/babylon_chain', 'https://discord.gg/babylonlabs', 'https://t.me/babylonlabs_official', 'https://github.com/babylonlabs-io'
),

-- Ethena
(
  'ethena', 'Ethena', 'https://images.pexels.com/photos/8370791/pexels-photo-8370791.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['DeFi']::category[],
  'High', 'Easy', '5–10 min/week', '2026-08-31',
  'Medium', 'Active', false, false, 4,
  'Ethena is the fastest-growing DeFi protocol of 2024-25, issuing USDe — an internet-native synthetic dollar backed by delta-neutral ETH/BTC positions. With $6B+ TVA and consistent 20-40% APY on sUSDe, Ethena has become the blue-chip yield protocol. Season 3 Sats campaign is live with confirmed ENA rewards.',
  'Ethena''s delta-neutral model depends on sustained funding rates — during bear markets, funding can go negative, reducing yields or requiring subsidies from the insurance fund. The protocol has a $50M insurance fund and strong audit coverage. Medium risk due to novel collateral mechanics rather than smart contract vulnerabilities.',
  'Season 3 Sats points convert to ENA at TGE. Based on Season 2 conversion rates and current ENA price (~$0.60), active users with $1,000+ in sUSDe can expect $500–$3,000 in ENA. Yield earned during the period is additional income on top of the airdrop.',
  'Ethena Labs has built USDe — a synthetic dollar that doesn''t rely on traditional banking infrastructure. USDe maintains its peg through delta-neutral positions: for every 1 ETH of collateral, Ethena opens a -1 ETH perpetual short, neutralising price exposure while capturing funding rate income.',
  'Ethena is unique in that you earn yield while farming the airdrop. sUSDe consistently pays 20-40% APY during bull markets, meaning you''re getting paid to hold a position that also earns Sats points toward ENA. This is the rare airdrop where the base-case is profitable regardless of token price.',
  '$500 – $3,000+ (+ yield)',
  'https://ethena.fi', 'https://twitter.com/ethena_labs', 'https://discord.gg/ethena', '', 'https://github.com/ethena-labs'
),

-- Story Protocol
(
  'story-protocol', 'Story Protocol', 'https://images.pexels.com/photos/8374342/pexels-photo-8374342.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Infrastructure','DeFi']::category[],
  'High', 'Easy', '10–15 min/week', '2026-11-30',
  'Low', 'Active', false, false, 5,
  'Story Protocol is the "IP blockchain" — built to make intellectual property programmable on-chain. Raised $140M at $2.25B valuation led by a16z Crypto. IP NFTs can be registered, licensed, and monetised onchain with royalty flows tracked automatically. IP token confirmed with airdrop for early network participants.',
  'Story has tier-1 VC backing (a16z, Polychain, Samsung Next) and a clear product-market fit in AI-generated content attribution. Main risk is regulatory: IP law is complex and jurisdiction-specific enforcement of onchain rights is untested. Technical risk is low — the team is ex-Google, ex-Meta, ex-OpenSea.',
  'IP token airdrop confirmed. Early testnet participants, IP NFT registrants, and Discord members form the eligible cohort. Based on a16z-backed projects (comparable: Worldcoin, EigenLayer), active participants can expect $300–$2,500 depending on depth of engagement.',
  'Story Protocol is a purpose-built blockchain for intellectual property. Creators can register any creative work as an IP Asset — an onchain NFT with programmable licensing terms. When derivative works are created, royalties flow automatically back through the IP graph to all original contributors.',
  'AI-generated content is creating a trillion-dollar IP attribution problem. Story Protocol is the only infrastructure-level solution building the rails for this. The a16z backing at a $2.25B valuation signals institutional conviction. Registering IP assets now costs almost nothing and directly earns you allocation.',
  '$300 – $2,500+',
  'https://story.foundation', 'https://twitter.com/storyprotocol', 'https://discord.gg/storyprotocol', '', 'https://github.com/storyprotocol'
),

-- Movement Network
(
  'movement', 'Movement Network', 'https://images.pexels.com/photos/8438995/pexels-photo-8438995.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2','Infrastructure']::category[],
  'High', 'Moderate', '15–25 min/week', '2026-10-31',
  'Low', 'Active', true, false, 6,
  'Movement is bringing the Move VM to Ethereum — combining Move''s resource-oriented security with EVM''s liquidity and developer ecosystem. $38M raised, and Move''s native safety guarantees (no reentrancy bugs possible) make it attractive to security-conscious developers. MOVE token confirmed, testnet live.',
  'Backed by Polychain and Binance Labs. Move language security model eliminates entire classes of smart contract bugs common on EVM. Main risk is ecosystem fragmentation — competing Move chains (Aptos, Sui) have head starts. However, EVM integration is a genuine differentiator that others lack.',
  'MOVE token is confirmed. Testnet participants and early protocol users are the primary eligible group. Based on similar Move-chain airdrops (Aptos ~$1,000–$8,000, Sui ~$500–$5,000), Movement participants can estimate $200–$2,000 for active testnet engagement.',
  'Movement Network is an Ethereum Layer 2 that runs the Move Virtual Machine (MoveVM) — the same execution environment used by Aptos and Sui. This gives Ethereum the security benefits of the Move language: resources cannot be copied or implicitly discarded, eliminating reentrancy attacks and common token vulnerabilities.',
  'Movement combines two powerful things: EVM''s $60B+ liquidity and developer base, with Move''s superior security model. This is not just another L2 — it''s a different execution paradigm. Given Aptos and Sui''s successful airdrops, Movement is well-positioned to reward early community members generously.',
  '$200 – $2,000+',
  'https://movementlabs.xyz', 'https://twitter.com/movementlabsxyz', 'https://discord.gg/movementlabs', '', 'https://github.com/movementlabsxyz'
),

-- Linea
(
  'linea', 'Linea', 'https://images.pexels.com/photos/8394660/pexels-photo-8394660.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2']::category[],
  'Medium', 'Easy', '10–20 min/week', '2026-09-15',
  'Low', 'Active', false, false, 7,
  'Linea is Consensys''s zkEVM Layer 2 built for the Ethereum ecosystem — and Consensys is the company behind MetaMask (30M users), Infura, and Truffle. No token yet, making this one of the highest-probability undropped L2s. Linea Surge incentive programme is live and explicitly rewards onchain activity.',
  'Linea benefits from Consensys''s corporate backing and integration into the MetaMask ecosystem — the largest self-custody wallet. Risk is political: Consensys has faced SEC regulatory pressure. Technical risk is low given the zkEVM architecture and extensive audit coverage. Token issuance timing is uncertain.',
  'Linea has not announced a token but the Linea Surge campaign with LXP (Linea Experience Points) is explicitly designed for airdrop eligibility. MetaMask integration gives it a 30M potential user base. Active Surge participants can estimate $200–$1,500 based on comparable zkEVM launches (zkSync, Scroll).',
  'Linea is Consensys''s zero-knowledge EVM Layer 2 for Ethereum. As the company behind MetaMask, Infura, and the broader Ethereum developer tooling stack, Consensys has an unmatched distribution advantage. Linea can be accessed directly from MetaMask, bringing L2 to tens of millions of existing users.',
  'The MetaMask integration is the key insight. If Linea launches a token and airdrop, the eligible user base could be in the tens of millions. Being an early active user — especially with the LXP points system — ensures you''re in the top cohort, not the late-adopter group who gets smaller allocations.',
  '$200 – $1,500+',
  'https://linea.build', 'https://twitter.com/lineabuild', 'https://discord.gg/linea', '', 'https://github.com/consensys/linea'
),

-- Taiko
(
  'taiko', 'Taiko', 'https://images.pexels.com/photos/8394670/pexels-photo-8394670.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=2',
  ARRAY['Ethereum']::blockchain[], ARRAY['Layer 2']::category[],
  'Medium', 'Easy', '5–15 min/week', '2026-08-15',
  'Low', 'Ending Soon', false, false, 8,
  'Taiko is a fully decentralised, Ethereum-equivalent ZK-Rollup. Unlike other zkEVMs that modify Ethereum for ZK compatibility, Taiko uses a Type-1 architecture — it is byte-for-byte identical to Ethereum. TAIKO token is live on mainnet, and ongoing protocol rewards are distributed to active users and provers.',
  'Taiko is the most Ethereum-aligned L2 by design — Type-1 zkEVM means zero deviation from Ethereum''s spec. Backed by Sequoia, Token Bay Capital, and Dragonfly. Main risk is proving costs: ZK proofs are computationally expensive and cost is passed to users via slightly higher fees. Security is best-in-class.',
  'TAIKO token is already live. Ongoing staking and protocol rewards are available. New users bridging and interacting with Taiko DeFi protocols earn TAIKO incentives. Current staking APY is approximately 8-15%. New wallet participants can expect $50–$500 in ongoing incentives.',
  'Taiko is the world''s first Type-1 ZK-EVM — meaning it processes Ethereum transactions exactly as Ethereum would, with zero modifications. All existing Ethereum smart contracts, tooling, and wallets work natively. This makes Taiko the most trustless and most Ethereum-aligned of all L2 solutions.',
  'Taiko already has a token, but ongoing protocol incentives continue to reward active users. Bridging ETH, using Taiko DeFi, and staking TAIKO puts you in position for future protocol revenue sharing. As ZK proving costs drop with hardware improvements, Taiko''s fee advantage will compound.',
  '$50 – $500+ (ongoing)',
  'https://taiko.xyz', 'https://twitter.com/taikoxyz', 'https://discord.gg/taikoxyz', '', 'https://github.com/taikoxyz'
);

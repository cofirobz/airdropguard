
-- Berachain tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join the official Discord and verify wallet', 'Go to discord.gg/berachain → #role-assignment → connect your wallet via Collab.land to receive the "Bera Citizen" role.', 1 FROM airdrops WHERE slug = 'berachain';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH to Berachain testnet', 'Use the Berachain faucet (faucet.berachain.com) to get testnet BERA, or bridge from Ethereum using the official bridge. Keep at least 0.5 BERA for gas.', 2 FROM airdrops WHERE slug = 'berachain';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Provide liquidity on BEX (native DEX)', 'Go to bex.berachain.com → Pools → Add liquidity to the BERA/HONEY pool. This earns BGT (Berachain Governance Token) — the key metric for airdrop eligibility.', 3 FROM airdrops WHERE slug = 'berachain';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Mint HONEY stablecoin', 'Go to honey.berachain.com → Mint HONEY by depositing USDC collateral. Holding HONEY signals you are a committed ecosystem participant.', 4 FROM airdrops WHERE slug = 'berachain';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake BGT with a validator', 'Go to bgt.berachain.com → Delegate your BGT to an active validator. BGT delegators are the core of Proof-of-Liquidity and receive the highest airdrop weight.', 5 FROM airdrops WHERE slug = 'berachain';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow @berachain on X and post testnet activity', 'Tweet your testnet activity using #berachain. Community engagement is tracked and can boost your allocation tier.', 6 FROM airdrops WHERE slug = 'berachain';

-- Monad tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Monad Discord and get community role', 'Go to discord.gg/monad → Complete onboarding quiz → Get "Monad Believer" role. Discord OG role is only available for early members.', 1 FROM airdrops WHERE slug = 'monad';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Request testnet MON from faucet', 'Visit the Monad testnet faucet. You may need to connect a wallet with Ethereum mainnet history to qualify for testnet tokens.', 2 FROM airdrops WHERE slug = 'monad';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete testnet swap on Monad DEX', 'Interact with at least one native DEX on Monad testnet. Swap MON for a testnet token. Transaction count matters for airdrop eligibility.', 3 FROM airdrops WHERE slug = 'monad';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Deploy or interact with a smart contract', 'Use Monad''s EVM compatibility to deploy a simple contract (Remix IDE works). Developer activity is heavily weighted in technical airdrops.', 4 FROM airdrops WHERE slug = 'monad';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow @monad_xyz and engage with content', 'Follow the official X account and retweet at least 3 posts about Monad testnet. Community metrics are monitored.', 5 FROM airdrops WHERE slug = 'monad';

-- Babylon tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Set up a compatible Bitcoin wallet', 'Install UniSat or OKX Wallet — both support Babylon BTC staking. Ensure your wallet has at least 0.01 BTC (the minimum staking amount).', 1 FROM airdrops WHERE slug = 'babylon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake BTC in Babylon Phase 1 or Phase 2', 'Go to btcstaking.babylonlabs.io → Connect your Bitcoin wallet → Stake at least 0.01 BTC. Staking is non-custodial — BTC stays in your wallet, locked by a timelock script.', 2 FROM airdrops WHERE slug = 'babylon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Hold staked position for at least 30 days', 'Duration of staking is a key allocation multiplier. Longer staking = higher BABY token allocation. Do not unbond early.', 3 FROM airdrops WHERE slug = 'babylon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Babylon Discord and follow on X', 'Join the official community channels. Babylon has confirmed community roles get additional allocation boosts.', 4 FROM airdrops WHERE slug = 'babylon';

-- Ethena tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Create account on app.ethena.fi', 'Visit app.ethena.fi → Connect wallet → Complete KYC if required for your region. Sats points require an active account.', 1 FROM airdrops WHERE slug = 'ethena';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Mint USDe with ETH, BTC, or stablecoins', 'Deposit ETH, stETH, USDT, or USDC to mint USDe. Minimum $100 recommended to earn meaningful Sats. Higher deposits = more Sats per day.', 2 FROM airdrops WHERE slug = 'ethena';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake USDe to receive sUSDe', 'Convert your USDe to sUSDe by staking in the app. sUSDe earns the highest Sats multiplier (2x) and also accrues the underlying yield (20-40% APY).', 3 FROM airdrops WHERE slug = 'ethena';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Hold sUSDe continuously for maximum Sats', 'Do not unstake. Sats accumulate daily. Streaks and continuous holding receive compounding multipliers. Check your Sats dashboard weekly.', 4 FROM airdrops WHERE slug = 'ethena';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Refer friends for Sats bonus', 'Share your referral link from the Ethena dashboard. Referrals earn you 10% of all Sats earned by people you refer — no cap.', 5 FROM airdrops WHERE slug = 'ethena';

-- Story Protocol tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Story Discord and claim early member role', 'Join discord.gg/storyprotocol → Complete verification → Claim early member role. The team has confirmed early community members receive allocation boosts.', 1 FROM airdrops WHERE slug = 'story-protocol';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Register an IP Asset on Story testnet', 'Go to portal.story.foundation → Connect wallet → Register any creative work (image, text, music) as an IP Asset NFT. Each registration earns protocol points.', 2 FROM airdrops WHERE slug = 'story-protocol';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Create a derivative work and pay royalties', 'Find an existing IP Asset on the portal → Create a derivative → Pay the license fee. This demonstrates your understanding of the protocol and earns additional points.', 3 FROM airdrops WHERE slug = 'story-protocol';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow @storyprotocol on X and engage', 'Follow the official account and interact with 5+ posts. Tag @storyprotocol in a post about IP and AI. Social metrics are tracked.', 4 FROM airdrops WHERE slug = 'story-protocol';

-- Movement tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Movement Discord and verify wallet', 'Join discord.gg/movementlabs → Verify with Collab.land → Get testnet access role. Early Discord members are prioritised.', 1 FROM airdrops WHERE slug = 'movement';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge to Movement testnet', 'Use the Movement bridge (bridge.movementlabs.xyz) to bridge ETH or USDC from Ethereum to Movement testnet. Bridge volume matters for airdrop weight.', 2 FROM airdrops WHERE slug = 'movement';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Swap tokens on Movement DEX', 'Use the native DEX on Movement testnet to perform at least 5 swaps. Transaction volume and count are primary eligibility metrics.', 3 FROM airdrops WHERE slug = 'movement';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Provide liquidity on Movement', 'Add liquidity to any pool on the Movement testnet DEX. LP activity signals protocol commitment and earns higher allocation tiers.', 4 FROM airdrops WHERE slug = 'movement';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow @movementlabsxyz and post about Movement', 'Follow on X and create a post about your Movement testnet experience. Use #Movement and #MoveEVM hashtags.', 5 FROM airdrops WHERE slug = 'movement';

-- Linea tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH to Linea via MetaMask', 'Open MetaMask → Networks → Linea → Bridge ETH. Alternatively use bridge.linea.build. Bridging is the first eligibility requirement for LXP.', 1 FROM airdrops WHERE slug = 'linea';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Activate Linea Surge and earn LXP', 'Go to linea.build/surge → Connect wallet → Complete the activation steps. LXP (Linea Experience Points) are the confirmed airdrop mechanism.', 2 FROM airdrops WHERE slug = 'linea';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Provide liquidity on Linea DEX (Lynex or Nile)', 'Deposit liquidity into a Linea-native DEX. LXP points are weighted by TVL contribution. Aim for $500+ for meaningful LXP accumulation.', 3 FROM airdrops WHERE slug = 'linea';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Use Linea DeFi (lending, yield)', 'Interact with Linea lending protocols (Zerolend, Compound on Linea). Multiple protocol interactions increase your LXP multiplier.', 4 FROM airdrops WHERE slug = 'linea';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Linea Discord and follow on X', 'Complete Discord verification and follow @lineabuild. Community engagement is factored into final airdrop allocation.', 5 FROM airdrops WHERE slug = 'linea';

-- Taiko tasks
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH to Taiko mainnet', 'Use bridge.taiko.xyz to bridge ETH from Ethereum mainnet to Taiko. Start with at least 0.01 ETH to cover gas for subsequent interactions.', 1 FROM airdrops WHERE slug = 'taiko';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Swap on Taiko''s native DEX', 'Use Taiko''s native DEX to perform at least 3 token swaps. Transaction history on mainnet directly informs ongoing reward distributions.', 2 FROM airdrops WHERE slug = 'taiko';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake TAIKO tokens', 'Purchase TAIKO (available on major CEXs) and stake via the Taiko staking interface. Current APY is 8-15% with additional protocol reward potential.', 3 FROM airdrops WHERE slug = 'taiko';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow @taikoxyz on X', 'Follow the official account and engage with content to stay updated on new reward programs and protocol developments.', 4 FROM airdrops WHERE slug = 'taiko';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH to Blast', 'Visit blast.io and bridge at least 0.01 ETH to the Blast L2 network to start earning Blast Points and native yield.', 1 FROM airdrops WHERE slug = 'blast';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Interact with a Blast dApp', 'Use at least one Blast-native dApp (e.g., Thruster, Orbit, or Pacmoon) to qualify for Blast Gold allocations.', 2 FROM airdrops WHERE slug = 'blast';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Hold assets for 30+ days', 'Keep bridged assets on Blast for at least 30 days to maximize your Points multiplier tier.', 3 FROM airdrops WHERE slug = 'blast';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow Blast on X and join Discord', 'Follow @blast_l2 on X and join the official Discord to stay updated on Blast Gold distribution events.', 4 FROM airdrops WHERE slug = 'blast';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Sign up on io.net', 'Create an account at io.net and connect your wallet to begin earning IO Points.', 1 FROM airdrops WHERE slug = 'io-net';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Connect a GPU worker', 'Download the io.net worker client and connect at least one GPU to the network to earn supplier rewards.', 2 FROM airdrops WHERE slug = 'io-net';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete IO ID verification', 'Complete the IO ID (identity) process on the platform to unlock higher reward tiers.', 3 FROM airdrops WHERE slug = 'io-net';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Refer a GPU supplier', 'Refer at least one other GPU supplier using your referral link to earn bonus IO Points.', 4 FROM airdrops WHERE slug = 'io-net';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Install the Grass browser extension', 'Download and install the Grass extension from getgrass.io to your Chrome or Brave browser.', 1 FROM airdrops WHERE slug = 'grass';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Connect your Solana wallet', 'Link a Solana wallet (Phantom, Backpack) to your Grass account to receive GRASS token rewards.', 2 FROM airdrops WHERE slug = 'grass';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Run the node for 7+ days', 'Keep the Grass extension active and your browser open for at least 7 days to earn significant epoch rewards.', 3 FROM airdrops WHERE slug = 'grass';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Refer 3 friends', 'Share your referral link to get 3 friends to install Grass, unlocking a 2x points multiplier on your node.', 4 FROM airdrops WHERE slug = 'grass';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Connect wallet to Pendle', 'Visit app.pendle.finance and connect your Web3 wallet to get started.', 1 FROM airdrops WHERE slug = 'pendle';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Provide liquidity to a pool', 'Supply assets to any active Pendle pool (e.g., stETH, USDC, USDe) to earn PENDLE emissions and trading fees.', 2 FROM airdrops WHERE slug = 'pendle';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Lock PENDLE for vePENDLE', 'Lock at least 10 PENDLE for a minimum of 4 weeks to earn vePENDLE and boost your LP rewards.', 3 FROM airdrops WHERE slug = 'pendle';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Vote on a gauge', 'Use your vePENDLE to vote for a liquidity gauge every epoch to earn additional protocol fee revenue.', 4 FROM airdrops WHERE slug = 'pendle';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Claim your DYM genesis airdrop', 'Check dymension.xyz with your Cosmos or Ethereum address to claim any genesis DYM allocation.', 1 FROM airdrops WHERE slug = 'dymension';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake DYM with a validator', 'Delegate at least 1 DYM to a validator on the Dymension hub to earn staking rewards and build your on-chain history.', 2 FROM airdrops WHERE slug = 'dymension';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge assets to a RollApp', 'Use the Dymension portal to bridge assets into at least one RollApp ecosystem to earn activity points.', 3 FROM airdrops WHERE slug = 'dymension';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Participate in governance', 'Vote on at least one governance proposal on the Dymension hub to demonstrate long-term commitment.', 4 FROM airdrops WHERE slug = 'dymension';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete Initia testnet tasks', 'Visit testnet.initia.xyz, connect your wallet, and complete the available on-chain testnet tasks to earn points.', 1 FROM airdrops WHERE slug = 'initia';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete Galxe quests', 'Visit the official Initia Galxe space and complete all available quests to earn OATs and bonus point multipliers.', 2 FROM airdrops WHERE slug = 'initia';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Interact with a Minitia', 'Use at least one Initia Minitia app (e.g., Initia DEX, NFT platform) on testnet to broaden your activity footprint.', 3 FROM airdrops WHERE slug = 'initia';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Discord and get OG role', 'Join the Initia Discord and complete verification to obtain community roles that may affect airdrop tiers.', 4 FROM airdrops WHERE slug = 'initia';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Connect X account to Kaito', 'Visit kaito.ai and connect your X (Twitter) account to start generating Yaps based on your crypto content.', 1 FROM airdrops WHERE slug = 'kaito';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Post quality crypto content', 'Share insightful threads, alpha, or analysis related to crypto projects to build your Yap score organically.', 2 FROM airdrops WHERE slug = 'kaito';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Engage with Kaito search', 'Use the Kaito search platform to research projects and interact with the InfoFi layer for activity-based rewards.', 3 FROM airdrops WHERE slug = 'kaito';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Hold KAITO tokens', 'Acquire and hold KAITO tokens to increase your ranking multiplier in future reward distributions.', 4 FROM airdrops WHERE slug = 'kaito';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH or LRT to Zircuit', 'Visit zircuit.com and bridge ETH, stETH, or any supported LRT to Zircuit mainnet to start earning ZRC points.', 1 FROM airdrops WHERE slug = 'zircuit';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Stake on Zircuit', 'Deposit assets into the Zircuit staking vault and leave them for at least 14 days to maximize your points tier.', 2 FROM airdrops WHERE slug = 'zircuit';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Interact with Zircuit dApps', 'Use at least one dApp deployed on Zircuit (DEX, lending, etc.) to diversify your on-chain activity score.', 3 FROM airdrops WHERE slug = 'zircuit';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Discord and verify', 'Join the Zircuit Discord, complete verification, and check for role-gated bonus tasks that boost your ZRC points.', 4 FROM airdrops WHERE slug = 'zircuit';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete Plume testnet onboarding', 'Visit testnet.plumenetwork.xyz, connect your wallet, and complete the onboarding flow to register for the airdrop.', 1 FROM airdrops WHERE slug = 'plume-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Interact with RWA assets on testnet', 'Buy, sell, or hold at least one tokenized RWA asset on the Plume testnet to qualify for higher reward tiers.', 2 FROM airdrops WHERE slug = 'plume-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete Galxe quests', 'Visit the Plume Network Galxe campaign and complete all available tasks for bonus PLUME point multipliers.', 3 FROM airdrops WHERE slug = 'plume-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow on X and join Discord', 'Follow @plumenetwork on X and join the Discord to remain eligible for community-based airdrop tiers.', 4 FROM airdrops WHERE slug = 'plume-network';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Deploy a contract on Fuel Ignition', 'Use the Fuel developer tools to deploy a simple smart contract (Sway) on Fuel Ignition mainnet.', 1 FROM airdrops WHERE slug = 'fuel-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge assets to Fuel', 'Bridge ETH or USDC from Ethereum to Fuel Ignition using the official bridge at app.fuel.network.', 2 FROM airdrops WHERE slug = 'fuel-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Swap on Fuel DEX', 'Perform at least 3 swaps on a Fuel-native DEX (e.g., Mira DEX) to demonstrate on-chain trading activity.', 3 FROM airdrops WHERE slug = 'fuel-network';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Complete Fuel Forum quests', 'Participate in the Fuel community forum and complete any developer challenges to earn builder-tier points.', 4 FROM airdrops WHERE slug = 'fuel-network';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Purchase a Sophon Node License', 'Buy a Sophon Node License on the secondary market or mint one during an open sale to earn the highest SOPH tier.', 1 FROM airdrops WHERE slug = 'sophon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Bridge ETH to Sophon', 'Bridge ETH to the Sophon chain via the official bridge at sophon.xyz to participate in on-chain farming.', 2 FROM airdrops WHERE slug = 'sophon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Play a Sophon game or social app', 'Interact with at least one Sophon-native game or social application to earn ecosystem activity points.', 3 FROM airdrops WHERE slug = 'sophon';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Join Discord and complete quests', 'Join the Sophon Discord and complete all verified quests to unlock the community reward tier.', 4 FROM airdrops WHERE slug = 'sophon';

INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Deposit into a Symbiotic vault', 'Visit app.symbiotic.fi, connect your wallet, and deposit ETH, stETH, or any supported asset into an open vault.', 1 FROM airdrops WHERE slug = 'symbiotic';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Choose a network operator', 'Opt into at least one network operator to extend your restaked collateral as security and begin earning restaking points.', 2 FROM airdrops WHERE slug = 'symbiotic';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Hold position for 30+ days', 'Maintain your vault position for at least 30 days continuously to qualify for the highest SYM allocation tier.', 3 FROM airdrops WHERE slug = 'symbiotic';
INSERT INTO airdrop_tasks (airdrop_id, title, description, sort_order)
SELECT id, 'Follow on X and join Discord', 'Follow @symbioticfi on X and join the Discord to be notified of snapshot dates and bonus point events.', 4 FROM airdrops WHERE slug = 'symbiotic';

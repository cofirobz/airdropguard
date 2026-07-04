-- Expand category enum to match frontend CATEGORY_OPTIONS.
-- Safe to re-run because each value uses IF NOT EXISTS.
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'DeFi',
    'NFT',
    'Layer 1',
    'Layer 2',
    'Layer 3',
    'Bridge',
    'Social',
    'SocialFi',
    'Gaming',
    'Infrastructure',
    'Wallet',
    'DAO',
    'Metaverse',
    'DEX',
    'Lending',
    'Perpetuals',
    'Restaking',
    'Liquid Staking',
    'RWA',
    'Oracle',
    'ZK',
    'Privacy',
    'Security',
    'Identity',
    'Messaging',
    'AI',
    'Data',
    'Data Availability',
    'DePIN',
    'Modular',
    'Interoperability',
    'Prediction Market',
    'Payments',
    'Stablecoin',
    'Launchpad',
    'Quest Platform',
    'Consumer Crypto',
    'Bitcoin Ecosystem',
    'Testnet',
    'Mainnet',
    'Other'
  ]
  LOOP
    EXECUTE format('ALTER TYPE public.category ADD VALUE IF NOT EXISTS %L', v);
  END LOOP;
END $$;

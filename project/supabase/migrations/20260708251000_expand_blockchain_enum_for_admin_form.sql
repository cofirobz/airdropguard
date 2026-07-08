DO $$
DECLARE
  chain text;
  chains text[] := ARRAY[
    'Ethereum',
    'Solana',
    'Base',
    'Arbitrum',
    'Optimism',
    'Polygon',
    'BNB Chain',
    'Avalanche',
    'Cosmos',
    'Starknet',
    'zkSync',
    'Linea',
    'Scroll',
    'Mantle',
    'Blast',
    'Sui',
    'Aptos',
    'Sei',
    'Berachain',
    'Monad',
    'Movement',
    'Hyperliquid',
    'Babylon',
    'Celestia',
    'Fuel',
    'Taiko',
    'Plume',
    'Sophon',
    'Eclipse',
    'TON',
    'Bitcoin',
    'Near',
    'Injective',
    'MultiversX',
    'Sonic',
    'Ronin',
    'Abstract',
    'MegaETH',
    'Multi-chain',
    'Other'
  ];
BEGIN
  FOREACH chain IN ARRAY chains LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
        AND t.typname = 'blockchain'
        AND e.enumlabel = chain
    ) THEN
      EXECUTE format('ALTER TYPE public.blockchain ADD VALUE %L', chain);
    END IF;
  END LOOP;
END
$$;

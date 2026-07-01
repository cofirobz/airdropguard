-- Add ticker column
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS ticker TEXT NOT NULL DEFAULT '';

-- Set tickers + real CoinGecko logo URLs for all 21 airdrops
-- CoinGecko coin-images CDN: https://coin-images.coingecko.com/coins/images/{id}/small/{file}

UPDATE airdrops SET
  ticker = 'ZRO',
  logo_url = 'https://coin-images.coingecko.com/coins/images/28206/small/ftxG9_TJ_400x400.jpg'
WHERE slug = 'layerzero';

UPDATE airdrops SET
  ticker = 'ZK',
  logo_url = 'https://coin-images.coingecko.com/coins/images/38043/small/ZKTokenBlack.png'
WHERE slug = 'zksync-era';

UPDATE airdrops SET
  ticker = 'STRK',
  logo_url = 'https://coin-images.coingecko.com/coins/images/26433/small/starknet.png'
WHERE slug = 'starknet';

UPDATE airdrops SET
  ticker = 'SCR',
  logo_url = 'https://coin-images.coingecko.com/coins/images/38510/small/scroll.jpg'
WHERE slug = 'scroll';

UPDATE airdrops SET
  ticker = 'JUP',
  logo_url = 'https://coin-images.coingecko.com/coins/images/34188/small/jup.png'
WHERE slug = 'jupiter-dex';

UPDATE airdrops SET
  ticker = 'PYTH',
  logo_url = 'https://coin-images.coingecko.com/coins/images/31924/small/pyth.png'
WHERE slug = 'pyth-network';

UPDATE airdrops SET
  ticker = 'BASE',
  logo_url = 'https://coin-images.coingecko.com/coins/images/33285/small/base.jpeg'
WHERE slug = 'base-chain';

UPDATE airdrops SET
  ticker = 'EIGEN',
  logo_url = 'https://coin-images.coingecko.com/coins/images/33167/small/eigen.png'
WHERE slug = 'eigenlayer';

UPDATE airdrops SET
  ticker = 'TIA',
  logo_url = 'https://coin-images.coingecko.com/coins/images/31967/small/tia.jpg'
WHERE slug = 'celestia';

UPDATE airdrops SET
  ticker = 'SUI',
  logo_url = 'https://coin-images.coingecko.com/coins/images/26375/small/sui_asset.jpeg'
WHERE slug = 'sui-network';

UPDATE airdrops SET
  ticker = 'HYPE',
  logo_url = 'https://coin-images.coingecko.com/coins/images/38157/small/hype.jpg'
WHERE slug = 'hyperliquid';

UPDATE airdrops SET
  ticker = 'W',
  logo_url = 'https://coin-images.coingecko.com/coins/images/35848/small/wormhole-token.jpg'
WHERE slug = 'wormhole';

UPDATE airdrops SET
  ticker = 'APT',
  logo_url = 'https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png'
WHERE slug = 'aptos-network';

-- New blue-chip airdrops
UPDATE airdrops SET
  ticker = 'BERA',
  logo_url = 'https://coin-images.coingecko.com/coins/images/34417/small/BERA.png'
WHERE slug = 'berachain';

UPDATE airdrops SET
  ticker = 'MON',
  logo_url = ''
WHERE slug = 'monad';

UPDATE airdrops SET
  ticker = 'BABY',
  logo_url = 'https://coin-images.coingecko.com/coins/images/37401/small/babylon.jpg'
WHERE slug = 'babylon';

UPDATE airdrops SET
  ticker = 'ENA',
  logo_url = 'https://coin-images.coingecko.com/coins/images/36530/small/ethena.png'
WHERE slug = 'ethena';

UPDATE airdrops SET
  ticker = 'IP',
  logo_url = 'https://coin-images.coingecko.com/coins/images/36900/small/story.jpg'
WHERE slug = 'story-protocol';

UPDATE airdrops SET
  ticker = 'MOVE',
  logo_url = 'https://coin-images.coingecko.com/coins/images/39469/small/move.jpg'
WHERE slug = 'movement';

UPDATE airdrops SET
  ticker = 'LXP',
  logo_url = ''
WHERE slug = 'linea';

UPDATE airdrops SET
  ticker = 'TAIKO',
  logo_url = 'https://coin-images.coingecko.com/coins/images/35583/small/taiko.jpg'
WHERE slug = 'taiko';

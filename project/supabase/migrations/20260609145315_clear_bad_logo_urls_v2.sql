-- Clear bad Pexels photo URLs from the blue-chip airdrops
UPDATE airdrops
SET logo_url = ''
WHERE slug IN (
  'berachain', 'monad', 'babylon', 'ethena',
  'story-protocol', 'movement', 'linea', 'taiko'
);

/**
 * src/utils/priceCache.ts
 *
 * Fetches live coin prices (ETH, MATIC) from CoinGecko's free public API.
 * Results are cached in memory for 2 minutes to avoid hammering the API.
 */

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface PriceCacheEntry {
  usd: number;
  fetchedAt: number;
}

const memCache: Record<string, PriceCacheEntry> = {};

const COIN_IDS: Record<string, string> = {
  ethereum: 'ethereum',
  polygon: 'matic-network',
  sepolia: 'ethereum', // testnet — use ETH price
};

/**
 * Fetches the USD price for the native token of a given network.
 * @param network  One of: 'ethereum' | 'polygon' | 'sepolia'
 * @returns USD price as a number, or null if the request fails.
 */
export async function getNativeTokenPriceUSD(
  network: string,
): Promise<number | null> {
  const coinId = COIN_IDS[network] ?? 'ethereum';

  const cached = memCache[coinId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.usd;
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const usd: number = data[coinId]?.usd;
    if (!usd) return null;

    memCache[coinId] = { usd, fetchedAt: Date.now() };
    return usd;
  } catch {
    return null;
  }
}

/**
 * Formats a balance (as a string of native token units) into a USD string.
 * @returns e.g. "$3,412.56" or null if price unknown
 */
export function toUSD(balance: string, priceUSD: number | null): string | null {
  if (priceUSD === null) return null;
  const value = parseFloat(balance) * priceUSD;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

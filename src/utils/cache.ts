// src/utils/cache.ts

interface CacheItem {
  balance: string;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'eth_balance_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedBalance = (address: string): CacheItem | null => {
  try {
    const itemStr = localStorage.getItem(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`);
    if (!itemStr) return null;

    const item: CacheItem = JSON.parse(itemStr);
    const now = new Date().getTime();

    // Check if cache has expired
    if (now - item.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`);
      return null;
    }

    return item;
  } catch (err) {
    console.error('Error reading from cache', err);
    return null;
  }
};

export const setCachedBalance = (address: string, balance: string): void => {
  try {
    const item: CacheItem = {
      balance,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${address.toLowerCase()}`, JSON.stringify(item));
  } catch (err) {
    console.error('Error writing to cache', err);
  }
};

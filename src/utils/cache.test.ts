// src/utils/cache.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedBalance, setCachedBalance } from './cache';

describe('Cache Utility', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should store and retrieve balance from cache', () => {
        const address = '0x1A2B';
        const balance = '1.5';

        setCachedBalance(address, balance);
        const cached = getCachedBalance(address);

        expect(cached).not.toBeNull();
        expect(cached?.balance).toBe(balance);
    });

    it('should return null for expired cache', () => {
        const address = '0x1A2B';
        const balance = '1.5';

        setCachedBalance(address, balance);

        // Advance time by 6 minutes (TTL is 5 mins)
        vi.advanceTimersByTime(6 * 60 * 1000);

        const cached = getCachedBalance(address);
        expect(cached).toBeNull();
    });

    it('should return null for nonexistent cache', () => {
        const cached = getCachedBalance('0xNonExistent');
        expect(cached).toBeNull();
    });
});

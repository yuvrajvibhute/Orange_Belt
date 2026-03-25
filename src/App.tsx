// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { ethers } from 'ethers';
import {
  fetchBalanceViaContract,
  fetchBatchBalances,
  getProviderForNetwork,
  NETWORKS,
  type NetworkKey,
} from './integration/contractIntegration';
import { getCachedBalance, setCachedBalance } from './utils/cache';
import { getNativeTokenPriceUSD, toUSD } from './utils/priceCache';
import LoadingIndicator from './components/LoadingIndicator';
import NetworkSelector from './components/NetworkSelector';
import WatchlistPanel from './components/WatchlistPanel';
import FundTransfer from './components/FundTransfer';
import type { WatchlistEntry } from './components/AddressCard';
import './index.css';

const WATCHLIST_KEY = 'eth_watchlist_v1';

type Tab = 'search' | 'watchlist' | 'transfer';

function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchlistEntry[];
  } catch {
    return [];
  }
}

function saveWatchlist(entries: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
}

function App() {
  const [tab, setTab] = useState<Tab>('search');
  const [network, setNetwork] = useState<NetworkKey>('ethereum');
  const [query, setQuery] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isENS, setIsENS] = useState(false);
  const [priceUSD, setPriceUSD] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(loadWatchlist);

  // Fetch price whenever network changes
  useEffect(() => {
    getNativeTokenPriceUSD(network).then(setPriceUSD);
  }, [network]);

  // Refresh watchlist balances when switching to watchlist tab
  const refreshWatchlist = useCallback(async (entries: WatchlistEntry[]) => {
    if (entries.length === 0) return;

    // Mark all as loading
    const loading = entries.map((e) => ({ ...e, loading: true }));
    setWatchlist(loading);

    const provider = getProviderForNetwork(network);

    // Only batch addresses on the current network
    const networkEntries = loading.filter((e) => e.network === network);
    const otherEntries = loading.filter((e) => e.network !== network);

    const updated: WatchlistEntry[] = [...otherEntries];

    if (networkEntries.length > 0) {
      try {
        const results = await fetchBatchBalances(
          networkEntries.map((e) => e.address),
          provider,
        );
        for (const entry of networkEntries) {
          const result = results.find((r) => r.address.toLowerCase() === entry.address.toLowerCase());
          updated.push({ ...entry, balance: result?.balance ?? null, loading: false });
        }
      } catch {
        for (const entry of networkEntries) {
          updated.push({ ...entry, balance: null, loading: false });
        }
      }
    }

    // Restore original order
    const ordered = entries.map(
      (orig) => updated.find((u) => u.address === orig.address) ?? orig,
    );
    setWatchlist(ordered);
    saveWatchlist(ordered);
  }, [network]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'watchlist') {
      refreshWatchlist(watchlist);
    }
  };

  const fetchBalance = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBalance(null);
    setResolvedAddress(null);
    setIsENS(false);
    setFromCache(false);

    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter an Ethereum address or ENS name');
      return;
    }

    try {
      setLoading(true);

      const isEnsName = trimmed.includes('.');

      // Validate non-ENS input early
      if (!isEnsName && !ethers.isAddress(trimmed)) {
        setError('Invalid Ethereum address format');
        return;
      }

      // Check cache (only for plain addresses)
      if (!isEnsName) {
        const cached = getCachedBalance(trimmed);
        if (cached) {
          setBalance(cached.balance);
          setResolvedAddress(trimmed);
          setFromCache(true);
          return;
        }
      }

      const provider = getProviderForNetwork(network);
      const { address, balance: bal } = await fetchBalanceViaContract(trimmed, provider);

      if (isEnsName) {
        setIsENS(true);
        setResolvedAddress(address);
      } else {
        setResolvedAddress(trimmed);
        setCachedBalance(trimmed, bal);
      }

      setBalance(bal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ENS') || msg.includes('resolve')) {
        setError('Could not resolve ENS name.');
      } else {
        setError('Failed to fetch balance. Check the address/name and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = () => {
    if (!resolvedAddress || balance === null) return;
    if (watchlist.some((e) => e.address === resolvedAddress)) return;

    const label = query.includes('.') ? query : `${resolvedAddress.slice(0, 6)}…${resolvedAddress.slice(-4)}`;
    const entry: WatchlistEntry = {
      address: resolvedAddress,
      label,
      network,
      balance,
      loading: false,
    };
    const next = [...watchlist, entry];
    setWatchlist(next);
    saveWatchlist(next);
  };

  const removeFromWatchlist = (address: string) => {
    const next = watchlist.filter((e) => e.address !== address);
    setWatchlist(next);
    saveWatchlist(next);
  };

  const isInWatchlist = resolvedAddress
    ? watchlist.some((e) => e.address === resolvedAddress)
    : false;

  const nativeSymbol = NETWORKS[network].symbol;
  const usdValue = balance ? toUSD(balance, priceUSD) : null;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="header-icon">◈</span>
          <span className="header-title">ETH Portfolio</span>
        </div>
        <NetworkSelector value={network} onChange={setNetwork} />
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav" role="tablist">
        <button
          className={`tab-btn${tab === 'search' ? ' tab-btn--active' : ''}`}
          onClick={() => handleTabChange('search')}
          role="tab"
          aria-selected={tab === 'search'}
        >
          🔍 Search
        </button>
        <button
          className={`tab-btn${tab === 'watchlist' ? ' tab-btn--active' : ''}`}
          onClick={() => handleTabChange('watchlist')}
          role="tab"
          aria-selected={tab === 'watchlist'}
          data-testid="watchlist-tab-btn"
        >
          📋 Watchlist
          {watchlist.length > 0 && (
            <span className="tab-badge">{watchlist.length}</span>
          )}
        </button>
        <button
          className={`tab-btn${tab === 'transfer' ? ' tab-btn--active' : ''}`}
          onClick={() => handleTabChange('transfer')}
          role="tab"
          aria-selected={tab === 'transfer'}
          data-testid="transfer-tab-btn"
        >
          💸 Transfer
        </button>
      </nav>

      {/* Main content */}
      <main className="app-main">
        {tab === 'search' ? (
          <div className="search-panel" data-testid="search-panel">
            <h1 className="panel-title">Balance Checker</h1>
            <p className="panel-sub">Enter an address or ENS name to get the current balance.</p>

            {priceUSD && (
              <div className="live-price-bar">
                <span className="price-dot" />
                <span>Live {nativeSymbol} Price: <strong>${priceUSD.toLocaleString()}</strong></span>
              </div>
            )}

            <form onSubmit={fetchBalance} className="form-group">
              <input
                type="text"
                className="input-field"
                placeholder="0x… or vitalik.eth"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                data-testid="address-input"
              />
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || !query.trim()}
              >
                {loading ? 'Checking…' : 'Check Balance'}
              </button>
            </form>

            {loading && <LoadingIndicator message="Querying the blockchain…" />}

            {error && (
              <div className="error-message" data-testid="error-message">{error}</div>
            )}

            {balance !== null && !loading && (
              <div className="result-card" data-testid="result-card">
                {isENS && (
                  <p className="ens-resolved">
                    <span className="ens-badge">ENS</span>
                    Resolved to: <code>{resolvedAddress}</code>
                  </p>
                )}
                <p className="text-muted">Current Balance</p>
                <h2 className="balance-value">
                  {balance} <span className="balance-symbol">{nativeSymbol}</span>
                </h2>
                {usdValue && <p className="balance-usd">{usdValue}</p>}
                {fromCache && (
                  <span className="cache-badge" data-testid="cache-badge">
                    Loaded from Cache
                  </span>
                )}
                <button
                  className={`watchlist-btn${isInWatchlist ? ' watchlist-btn--added' : ''}`}
                  onClick={addToWatchlist}
                  disabled={isInWatchlist}
                  data-testid="add-watchlist-btn"
                >
                  {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
                </button>
              </div>
            )}
          </div>
        ) : tab === 'watchlist' ? (
          <div className="watchlist-view">
            <h1 className="panel-title">My Watchlist</h1>
            <p className="panel-sub">Track and monitor your Ethereum addresses in one place.</p>
            <WatchlistPanel
              entries={watchlist}
              priceUSD={priceUSD}
              network={network}
              onRemove={removeFromWatchlist}
            />
          </div>
        ) : (
          <FundTransfer />
        )}
      </main>
    </div>
  );
}

export default App;

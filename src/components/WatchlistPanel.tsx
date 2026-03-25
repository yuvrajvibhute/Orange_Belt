// src/components/WatchlistPanel.tsx
import React from 'react';
import AddressCard, { type WatchlistEntry } from './AddressCard';
import { toUSD } from '../utils/priceCache';

interface WatchlistPanelProps {
  entries: WatchlistEntry[];
  priceUSD: number | null;
  network: string;
  onRemove: (address: string) => void;
}

const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  entries,
  priceUSD,
  onRemove,
}) => {
  if (entries.length === 0) {
    return (
      <div className="watchlist-empty" data-testid="watchlist-empty">
        <p className="empty-icon">📋</p>
        <p className="empty-text">Your watchlist is empty.</p>
        <p className="empty-sub">Search for an address and click <strong>Add to Watchlist</strong>.</p>
      </div>
    );
  }

  // Portfolio total — sum all ETH/native balances and convert to USD
  const totalUSD = (() => {
    if (priceUSD === null) return null;
    const total = entries.reduce((sum, e) => {
      if (!e.balance) return sum;
      return sum + parseFloat(e.balance) * priceUSD;
    }, 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(total);
  })();

  const totalNative = entries.reduce((sum, e) => {
    return sum + parseFloat(e.balance ?? '0');
  }, 0);

  return (
    <div className="watchlist-panel" data-testid="watchlist-panel">
      {/* Portfolio summary bar */}
      <div className="portfolio-summary">
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Addresses</span>
          <span className="portfolio-stat-value">{entries.length}</span>
        </div>
        <div className="portfolio-divider" />
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Total Balance</span>
          <span className="portfolio-stat-value">{totalNative.toFixed(4)}</span>
        </div>
        <div className="portfolio-divider" />
        <div className="portfolio-stat">
          <span className="portfolio-stat-label">Portfolio Value</span>
          <span className="portfolio-stat-value portfolio-usd">
            {totalUSD ?? '—'}
          </span>
        </div>
      </div>

      {/* Address cards grid */}
      <div className="cards-grid">
        {entries.map((entry) => (
          <AddressCard
            key={entry.address}
            entry={entry}
            priceUSD={priceUSD}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
};

export default WatchlistPanel;

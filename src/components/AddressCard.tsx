// src/components/AddressCard.tsx
import React, { useState } from 'react';
import { NETWORKS, type NetworkKey } from '../integration/contractIntegration';
import { toUSD } from '../utils/priceCache';

export interface WatchlistEntry {
  address: string;
  label: string;
  network: NetworkKey;
  balance: string | null;
  loading: boolean;
}

interface AddressCardProps {
  entry: WatchlistEntry;
  priceUSD: number | null;
  onRemove: (address: string) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ entry, priceUSD, onRemove }) => {
  const [copied, setCopied] = useState(false);

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const network = NETWORKS[entry.network];
  const usd = entry.balance ? toUSD(entry.balance, priceUSD) : null;

  return (
    <div className="address-card" data-testid="address-card">
      <div className="card-header">
        <div className="card-title-row">
          <span className="card-label" title={entry.label}>{entry.label || 'Unnamed'}</span>
          <span className={`network-badge network-badge--${entry.network}`}>
            {network.symbol} · {network.label.split(' ')[0]}
          </span>
        </div>
        <div className="card-address-row">
          <span className="card-address" title={entry.address}>
            {truncate(entry.address)}
          </span>
          <button className="icon-btn" onClick={handleCopy} title="Copy address">
            {copied ? '✓' : '⧉'}
          </button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={() => onRemove(entry.address)}
            title="Remove from watchlist"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="card-body">
        {entry.loading ? (
          <div className="card-loading">
            <div className="spinner spinner--sm" />
          </div>
        ) : entry.balance !== null ? (
          <>
            <p className="card-balance">{entry.balance} <span className="card-symbol">{network.symbol}</span></p>
            {usd && <p className="card-usd">{usd}</p>}
          </>
        ) : (
          <p className="card-error">Could not fetch balance</p>
        )}
      </div>
    </div>
  );
};

export default AddressCard;

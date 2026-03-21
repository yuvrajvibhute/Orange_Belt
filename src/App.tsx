import { useState, FormEvent, useEffect } from 'react';
import { ethers } from 'ethers';
import { getCachedBalance, setCachedBalance } from './utils/cache';
import LoadingIndicator from './components/LoadingIndicator';
import './index.css';

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchBalance = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBalance(null);
    setFromCache(false);

    if (!address) {
      setError('Please enter an Ethereum address');
      return;
    }

    try {
      // Basic validation
      if (!ethers.isAddress(address)) {
        setError('Invalid Ethereum address format');
        return;
      }

      setLoading(true);

      // 1. Check Cache first
      const cached = getCachedBalance(address);
      if (cached) {
        setBalance(cached.balance);
        setFromCache(true);
        setLoading(false);
        return;
      }

      // 2. Fetch from blockchain
      const provider = ethers.getDefaultProvider('mainnet');
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      // We cut down the decimals for display
      const formattedBalance = parseFloat(balanceEth).toFixed(4);

      // 3. Save to cache
      setCachedBalance(address, formattedBalance);

      setBalance(formattedBalance);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch balance. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">ETH Balance Checker</h1>
      <p className="subtitle">Enter an Ethereum address to check its balance</p>

      <form onSubmit={fetchBalance} className="form-group">
        <input
          type="text"
          className="input-field"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
          data-testid="address-input"
        />
        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !address}
        >
          {loading ? 'Checking...' : 'Check Balance'}
        </button>
      </form>

      {loading && <LoadingIndicator message="Querying the blockchain, please wait..." />}

      {error && (
        <div className="error-message" data-testid="error-message">
          {error}
        </div>
      )}

      {balance !== null && !loading && (
        <div className="result-card" data-testid="result-card">
          <p className="text-muted">Current Balance</p>
          <h2 className="balance-value">{balance} ETH</h2>
          {fromCache && (
            <span className="cache-badge" data-testid="cache-badge">
              Loaded from Cache
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

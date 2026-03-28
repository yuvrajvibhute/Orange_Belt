// src/App.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// ── Mock ethers ──────────────────────────────────────────────────────────────
vi.mock('ethers', () => ({
  ethers: {
    isAddress: vi.fn().mockImplementation(
      (addr: string) => addr.startsWith('0x') && addr.length === 42
    ),
  },
}));

// ── Mock contractIntegration (all vi.fn() inline, no top-level references) ──
vi.mock('./integration/contractIntegration', () => ({
  NETWORKS: {
    ethereum: { label: 'Ethereum Mainnet', symbol: 'ETH',  rpcUrl: '', chainId: 1 },
    polygon:  { label: 'Polygon Mainnet',  symbol: 'MATIC', rpcUrl: '', chainId: 137 },
    sepolia:  { label: 'Sepolia Testnet',  symbol: 'ETH',  rpcUrl: '', chainId: 11155111 },
  },
  getProviderForNetwork: vi.fn().mockReturnValue({}),
  getDefaultProvider:    vi.fn().mockReturnValue({}),
  fetchBalanceViaContract: vi.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890',
    balance: '1.0000',
  }),
  fetchBatchBalances: vi.fn().mockResolvedValue([
    { address: '0x1234567890123456789012345678901234567890', balance: '1.0000' },
  ]),
  resolveENS: vi.fn().mockResolvedValue(null),
  BALANCE_CHECKER_ADDRESS: '0x0000000000000000000000000000000000000000',
  BALANCE_CHECKER_ABI: [],
}));

// ── Mock priceCache ──────────────────────────────────────────────────────────
vi.mock('./utils/priceCache', () => ({
  getNativeTokenPriceUSD: vi.fn().mockResolvedValue(2500),
  toUSD: vi.fn().mockReturnValue('$2,500.00'),
}));

// ────────────────────────────────────────────────────────────────────────────
const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('App — Search Tab', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Search tab with correct initial state', () => {
    render(<App />);
    expect(screen.getByText('Balance Checker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Balance/i })).toBeDisabled();
  });

  it('shows error on invalid address', async () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('address-input'), {
      target: { value: 'invalid_address' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Balance/i }));

    await waitFor(() =>
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Invalid Ethereum address format'
      )
    );
  });

  it('fetches and displays balance with loading indicator', async () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('address-input'), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Balance/i }));

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      expect(screen.getByTestId('result-card')).toBeInTheDocument();
      expect(screen.getByText(/1\.0000/)).toBeInTheDocument();
    });
  });
});

describe('App — Watchlist Tab', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty watchlist when nothing is saved', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('watchlist-tab-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('watchlist-empty')).toBeInTheDocument()
    );
  });

  it('adds an address to the watchlist after fetching balance', async () => {
    render(<App />);

    fireEvent.change(screen.getByTestId('address-input'), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.click(screen.getByRole('button', { name: /Check Balance/i }));

    await waitFor(() =>
      expect(screen.getByTestId('result-card')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('add-watchlist-btn'));
    expect(screen.getByTestId('add-watchlist-btn')).toHaveTextContent('✓ In Watchlist');
  });

  it('removes an entry from the watchlist', async () => {
    const entry = {
      address: VALID_ADDRESS,
      label: '0x1234…7890',
      network: 'ethereum',
      balance: '1.0000',
      loading: false,
    };
    localStorage.setItem('eth_watchlist_v1', JSON.stringify([entry]));

    render(<App />);
    fireEvent.click(screen.getByTestId('watchlist-tab-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('watchlist-panel')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTitle('Remove from watchlist'));

    await waitFor(() =>
      expect(screen.getByTestId('watchlist-empty')).toBeInTheDocument()
    );
  });
});

describe('App — Transfer Tab', () => {
  it('renders Transfer tab with Freighter wallet CTA', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('transfer-tab-btn'));
    
    await waitFor(() => {
      expect(screen.getByText('Fund Transfer')).toBeInTheDocument();
      expect(screen.getByTestId('connect-wallet-btn')).toHaveTextContent(/Connect Freighter/i);
    });
  });
});

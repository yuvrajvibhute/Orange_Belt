// src/components/FundTransfer.tsx
import { useState, useCallback } from 'react';
import {
  isConnected,
  getAddress,
  signTransaction,
  getNetwork,
  setAllowed,
} from '@stellar/freighter-api';
import {
  Horizon,
  Networks,
  TransactionBuilder,
  Asset,
  Operation,
  Memo,
} from '@stellar/stellar-sdk';

// ─── Stellar network config ─────────────────────────────────────────────────
type StellarNet = 'mainnet' | 'testnet';

const STELLAR_NETWORKS: Record<
  StellarNet,
  { label: string; horizonUrl: string; passphrase: string; explorerBase: string }
> = {
  mainnet: {
    label: 'Stellar Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    passphrase: Networks.PUBLIC,
    explorerBase: 'https://stellar.expert/explorer/public/tx/',
  },
  testnet: {
    label: 'Stellar Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    passphrase: Networks.TESTNET,
    explorerBase: 'https://stellar.expert/explorer/testnet/tx/',
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface TxRecord {
  hash: string;
  to: string;
  amount: string;
  memo: string;
  network: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

const TX_HISTORY_KEY = 'stellar_tx_history_v1';

function loadHistory(): TxRecord[] {
  try {
    const raw = localStorage.getItem(TX_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as TxRecord[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: TxRecord[]) {
  localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(records.slice(0, 20)));
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function FundTransfer() {
  const [stellarNet, setStellarNet] = useState<StellarNet>('testnet');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const [status, setStatus] = useState<'idle' | 'connecting' | 'sending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<TxRecord[]>(loadHistory);

  const netCfg = STELLAR_NETWORKS[stellarNet];

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async (pk: string, net: StellarNet) => {
    try {
      const server = new Horizon.Server(STELLAR_NETWORKS[net].horizonUrl);
      const account = await server.loadAccount(pk);
      const xlm = account.balances.find((b) => b.asset_type === 'native');
      setXlmBalance(xlm ? parseFloat(xlm.balance).toFixed(4) : '0.0000');
    } catch {
      setXlmBalance(null);
    }
  }, []);

  // ─── Connect Freighter ────────────────────────────────────────────────────
  const connectWallet = async () => {
    setStatus('connecting');
    setErrorMsg(null);

    try {
      const connRes = await isConnected();
      if (!connRes.isConnected) {
        setErrorMsg('Freighter extension not detected. Please install Freighter from freighter.app');
        setStatus('error');
        return;
      }

      const allowedRes = await setAllowed();
      if (allowedRes.error || !allowedRes.isAllowed) {
        setErrorMsg('Connection declined. Please allow the app to connect in Freighter popup.');
        setStatus('error');
        return;
      }

      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        setErrorMsg('Could not retrieve public key. Make sure Freighter is unlocked and has approved this site.');
        setStatus('error');
        return;
      }
      const pk = addressResult.address;

      // Check network in Freighter matches
      const netRes = await getNetwork();
      const netName = netRes.network || '';
      const isTestnet = netName.toLowerCase().includes('test');
      const autoNet: StellarNet = isTestnet ? 'testnet' : 'mainnet';

      setStellarNet(autoNet);
      setPublicKey(pk);
      await fetchBalance(pk, autoNet);
      setStatus('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.includes('rejected') || msg.includes('user') ? 'Connection declined by user.' : `Connection failed: ${msg.slice(0, 120)}`);
      setStatus('error');
    }
  };

  // ─── Send XLM ─────────────────────────────────────────────────────────────
  const sendTransaction = async () => {
    if (!publicKey) return;
    setErrorMsg(null);

    const trimTo = toAddress.trim();
    if (!trimTo || trimTo.length < 56) {
      setErrorMsg('Enter a valid Stellar public key (starts with G…).');
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Enter a valid amount greater than 0.');
      return;
    }

    setStatus('sending');
    setTxHash(null);

    try {
      const server = new Horizon.Server(netCfg.horizonUrl);
      const account = await server.loadAccount(publicKey);

      const txBuilder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: netCfg.passphrase,
      })
        .addOperation(
          Operation.payment({
            destination: trimTo,
            asset: Asset.native(),
            amount: parsed.toFixed(7),
          }),
        )
        .setTimeout(180);

      if (memo.trim()) {
        txBuilder.addMemo(Memo.text(memo.trim().slice(0, 28)));
      }

      const tx = txBuilder.build();
      const xdr = tx.toXDR();

      // Sign via Freighter
      const signResult = await signTransaction(xdr, {
        networkPassphrase: netCfg.passphrase,
      });

      if (signResult.error || !signResult.signedTxXdr) {
        throw new Error(signResult.error || 'Transaction signed successfully but XDR missing.');
      }

      const signedXdr = signResult.signedTxXdr;

      // Submit
      const { TransactionBuilder: TB } = await import('@stellar/stellar-sdk');
      const signedTx = TB.fromXDR(signedXdr, netCfg.passphrase);
      const response = await server.submitTransaction(signedTx);

      const hash = response.hash;
      setTxHash(hash);
      setStatus('success');

      const record: TxRecord = {
        hash,
        to: trimTo,
        amount: parsed.toFixed(4),
        memo: memo.trim(),
        network: netCfg.label,
        timestamp: Date.now(),
        status: 'confirmed',
      };
      const next = [record, ...history];
      setHistory(next);
      saveHistory(next);

      setToAddress('');
      setAmount('');
      setMemo('');
      await fetchBalance(publicKey, stellarNet);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        msg.toLowerCase().includes('declined') || msg.toLowerCase().includes('rejected')
          ? 'Transaction declined by user in Freighter.'
          : `Transaction failed: ${msg.slice(0, 160)}`,
      );
      setStatus('error');
    }
  };

  const statusColor: Record<TxRecord['status'], string> = {
    pending: 'var(--amber)',
    confirmed: 'var(--green)',
    failed: 'var(--red)',
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="transfer-panel">
      <div className="transfer-header-row">
        <div>
          <h1 className="panel-title">Fund Transfer</h1>
          <p className="panel-sub">Send XLM on Stellar via Freighter wallet.</p>
        </div>
        {/* Stellar network toggle */}
        <div className="stellar-net-toggle">
          {(['mainnet', 'testnet'] as StellarNet[]).map((n) => (
            <button
              key={n}
              className={`snet-btn${stellarNet === n ? ' snet-btn--active' : ''}`}
              onClick={() => {
                setStellarNet(n);
                if (publicKey) fetchBalance(publicKey, n);
              }}
              disabled={!!publicKey}
            >
              {n === 'mainnet' ? '🌍 Mainnet' : '🧪 Testnet'}
            </button>
          ))}
        </div>
      </div>

      {!publicKey ? (
        /* ── Not connected ── */
        <div className="wallet-cta">
          <div className="freighter-logo">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="26" fill="url(#fg)" />
              <path d="M14 26L26 14L38 26L26 38L14 26Z" fill="white" fillOpacity="0.9" />
              <path d="M20 26L26 20L32 26L26 32L20 26Z" fill="#6C63FF" />
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="52" y2="52">
                  <stop stopColor="#7B5CF2" />
                  <stop offset="1" stopColor="#2CDEE5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p className="wallet-cta-text">
            Connect your <strong>Freighter</strong> wallet to send XLM on Stellar.
          </p>
          <button
            className="submit-btn freighter-connect-btn"
            onClick={connectWallet}
            disabled={status === 'connecting'}
            data-testid="connect-wallet-btn"
          >
            {status === 'connecting' ? 'Connecting…' : 'Connect Freighter'}
          </button>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noreferrer"
            className="get-freighter-link"
          >
            Don't have Freighter? Get it here ↗
          </a>
          {errorMsg && (
            <div className="error-message" style={{ marginTop: 14, maxWidth: 420, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Wallet info bar ── */}
          <div className="wallet-info-bar">
            <div className="wallet-dot" />
            <span className="wallet-address-label" title={publicKey}>
              {publicKey.slice(0, 6)}…{publicKey.slice(-4)}
            </span>
            {xlmBalance !== null && (
              <span className="wallet-balance-pill">
                {xlmBalance} <span style={{ color: 'var(--primary)' }}>XLM</span>
              </span>
            )}
            <span className="stellar-net-pill">
              {stellarNet === 'testnet' ? '🧪 Testnet' : '🌍 Mainnet'}
            </span>
            <button
              className="icon-btn"
              style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
              onClick={() => { setPublicKey(null); setXlmBalance(null); setStatus('idle'); }}
            >
              Disconnect
            </button>
          </div>

          {/* ── Transfer form ── */}
          <div className="transfer-form-card">
            <div className="form-group" style={{ gap: 16 }}>
              <div>
                <label className="field-label">Recipient Stellar Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="G…"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  disabled={status === 'sending'}
                  data-testid="transfer-to-input"
                />
              </div>

              <div>
                <label className="field-label">Amount (XLM)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="1.00"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={status === 'sending'}
                  data-testid="transfer-amount-input"
                />
              </div>

              <div>
                <label className="field-label">Memo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional, max 28 chars)</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Payment for…"
                  maxLength={28}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={status === 'sending'}
                  data-testid="transfer-memo-input"
                />
              </div>

              {errorMsg && (
                <div className="error-message" data-testid="transfer-error">{errorMsg}</div>
              )}

              {status === 'success' && txHash && (
                <div className="tx-success-banner">
                  <span>✅ Transaction Confirmed!</span>
                  <a
                    href={`${netCfg.explorerBase}${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tx-link"
                  >
                    View on Stellar Expert ↗
                  </a>
                </div>
              )}

              <button
                className="submit-btn"
                onClick={sendTransaction}
                disabled={status === 'sending' || !toAddress.trim() || !amount}
                data-testid="send-btn"
              >
                {status === 'sending' ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="spinner spinner--sm" style={{ display: 'inline-block' }} />
                    Sending…
                  </span>
                ) : (
                  'Send XLM via Freighter'
                )}
              </button>
            </div>
          </div>

          {/* ── Tx History ── */}
          {history.length > 0 && (
            <div className="tx-history">
              <div className="tx-history-header">
                <span>Recent Transactions</span>
                <button
                  className="icon-btn"
                  onClick={() => { setHistory([]); saveHistory([]); }}
                  style={{ fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              </div>
              {history.map((tx) => (
                <div key={tx.hash} className="tx-row">
                  <div className="tx-row-left">
                    <span className="tx-status-dot" style={{ background: statusColor[tx.status] }} />
                    <div>
                      <div className="tx-amount">
                        {tx.amount} <span style={{ color: 'var(--primary)' }}>XLM</span>
                        {tx.memo && <span className="tx-memo-badge">{tx.memo}</span>}
                      </div>
                      <div className="tx-to">
                        → {tx.to.slice(0, 8)}…{tx.to.slice(-6)}
                        <span className="tx-network-badge">{tx.network}</span>
                      </div>
                    </div>
                  </div>
                  <div className="tx-row-right">
                    <span className="tx-status-label" style={{ color: statusColor[tx.status] }}>
                      {tx.status}
                    </span>
                    <a
                      href={`${STELLAR_NETWORKS[stellarNet].explorerBase}${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tx-link"
                      style={{ fontSize: '0.72rem' }}
                    >
                      ↗
                    </a>
                    <span className="tx-time">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

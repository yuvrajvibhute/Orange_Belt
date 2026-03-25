/**
 * contractIntegration.ts
 *
 * Integration layer between the BalanceChecker smart contract and the frontend.
 * Provides typed wrappers around ethers.js calls so the UI never touches raw
 * contract ABI details directly.
 *
 * CONTRACT: contracts/BalanceChecker.sol  (deploy to any EVM-compatible network)
 */

import { ethers, type Provider } from 'ethers';

// ---------------------------------------------------------------------------
// ABI  – only the functions we actually call from the frontend
// ---------------------------------------------------------------------------
export const BALANCE_CHECKER_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
    ],
    name: 'getBalances',
    outputs: [
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ---------------------------------------------------------------------------
// Network configuration
// ---------------------------------------------------------------------------
export type NetworkKey = 'ethereum' | 'polygon' | 'sepolia';

export interface NetworkConfig {
  label: string;
  symbol: string;
  rpcUrl: string;
  chainId: number;
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  ethereum: {
    label: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1,
  },
  polygon: {
    label: 'Polygon Mainnet',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon.llamarpc.com',
    chainId: 137,
  },
  sepolia: {
    label: 'Sepolia Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    chainId: 11155111,
  },
};

// ---------------------------------------------------------------------------
// Contract address – replace with the deployed address after you run:
//   npx hardhat run scripts/deploy.js --network <network>
// ---------------------------------------------------------------------------
export const BALANCE_CHECKER_ADDRESS =
  '0x0000000000000000000000000000000000000000'; // TODO: set after deployment

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getContract(provider: Provider) {
  return new ethers.Contract(
    BALANCE_CHECKER_ADDRESS,
    BALANCE_CHECKER_ABI,
    provider,
  );
}

const isContractDeployed =
  BALANCE_CHECKER_ADDRESS !== '0x0000000000000000000000000000000000000000';

/**
 * Returns a provider for the given network key.
 */
export function getProviderForNetwork(
  network: NetworkKey,
): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORKS[network].rpcUrl);
}

/**
 * Returns the default provider (Ethereum mainnet).
 */
export function getDefaultProvider(): ethers.JsonRpcProvider {
  return getProviderForNetwork('ethereum');
}

/**
 * Resolves an ENS name to an Ethereum address.
 * Returns null if not an ENS name or resolution fails.
 */
export async function resolveENS(
  nameOrAddress: string,
  provider: Provider,
): Promise<string | null> {
  if (!nameOrAddress.includes('.')) return null;
  try {
    const resolved = await provider.resolveName(nameOrAddress);
    return resolved; // string | null
  } catch {
    return null;
  }
}

/**
 * Fetch the ETH/native balance of a single address (via contract or direct RPC).
 * Supports ENS names as input.
 *
 * @returns object with resolved address and formatted balance (4 dp)
 */
export async function fetchBalanceViaContract(
  addressOrENS: string,
  provider: Provider,
): Promise<{ address: string; balance: string }> {
  let address = addressOrENS;

  // ENS resolution
  const resolved = await resolveENS(addressOrENS, provider);
  if (resolved) {
    address = resolved;
  } else if (!ethers.isAddress(addressOrENS)) {
    throw new Error('Invalid Ethereum address or ENS name');
  }

  let balanceWei: bigint;

  if (isContractDeployed) {
    const contract = getContract(provider);
    balanceWei = (await contract.getBalance(address)) as bigint;
  } else {
    balanceWei = await provider.getBalance(address);
  }

  return {
    address,
    balance: parseFloat(ethers.formatEther(balanceWei)).toFixed(4),
  };
}

/**
 * Fetch balances for multiple addresses in a single contract call (or parallel fallback).
 */
export async function fetchBatchBalances(
  addresses: string[],
  provider: Provider,
): Promise<Array<{ address: string; balance: string }>> {
  const validAddresses = addresses.filter((a) => ethers.isAddress(a));
  if (validAddresses.length === 0) return [];

  if (isContractDeployed) {
    const contract = getContract(provider);
    const rawBalances = (await contract.getBalances(
      validAddresses,
    )) as bigint[];
    return validAddresses.map((address, i) => ({
      address,
      balance: parseFloat(ethers.formatEther(rawBalances[i])).toFixed(4),
    }));
  }

  // Fallback: parallel individual calls
  return Promise.all(
    validAddresses.map(async (address) => {
      const balanceWei = await provider.getBalance(address);
      return {
        address,
        balance: parseFloat(ethers.formatEther(balanceWei)).toFixed(4),
      };
    }),
  );
}

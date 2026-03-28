# Balance Checker (Rust/Soroban)

This is a Rust equivalent of the `BalanceChecker.sol` smart contract, written using the Soroban SDK for the Stellar network. It provides equivalent functionality for fetching single or multiple balances.

## Prerequisites
Since Rust (`cargo`) is currently not installed or not in your PATH, you will need to install it to compile this smart contract.

1. Install Rust: Visit [rustup.rs](https://rustup.rs/) and download the installer for Windows, or run standard setup if in WSL.
2. Add the Wasm target: 
   ```powershell
   rustup target add wasm32-unknown-unknown
   ```
3. Install the Soroban CLI:
   ```powershell
   cargo install --locked soroban-cli
   ```

## Building
Once Rust is installed, you can build the contract into a `.wasm` binary file by running:
```powershell
cargo build --target wasm32-unknown-unknown --release
```

## Functional Mapping
| Solidity (BalanceChecker.sol) | Rust / Soroban equivalent (lib.rs) |
| --- | --- |
| `getBalance(address)` | `get_balance(env, token_address, account)` |
| `getBalances(address[])` | `get_balances(env, token_address, accounts)` |
| `getMyBalance()` | `get_my_balance(env, token_address, caller)` |

Note: Unlike Ethereum where `balance` is native to an address, in Soroban/Stellar, balances belong to specific deployed Token contracts (including the native XLM token). Therefore, the token's address must be provided when checking balances.

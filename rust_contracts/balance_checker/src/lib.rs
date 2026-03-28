#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env, Vec};

#[contract]
pub struct BalanceChecker;

#[contractimpl]
impl BalanceChecker {
    /// Returns the balance of a single address for a specific token (e.g., native XLM)
    pub fn get_balance(env: Env, token: Address, account: Address) -> i128 {
        let client = token::Client::new(&env, &token);
        client.balance(&account)
    }

    /// Returns the token balances for multiple addresses in a single call
    pub fn get_balances(env: Env, token: Address, accounts: Vec<Address>) -> Vec<i128> {
        let client = token::Client::new(&env, &token);
        let mut balances = Vec::new(&env);
        for account in accounts.iter() {
            balances.push_back(client.balance(&account));
        }
        balances
    }

    /// Returns the caller's balance. Requires authorization to ensure `caller` is indeed the caller.
    pub fn get_my_balance(env: Env, token: Address, caller: Address) -> i128 {
        caller.require_auth();
        let client = token::Client::new(&env, &token);
        client.balance(&caller)
    }
}

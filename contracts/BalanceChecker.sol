// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BalanceChecker
 * @dev A simple contract that allows querying multiple ETH balances in one call.
 *      This reduces RPC round-trips when checking multiple addresses.
 */
contract BalanceChecker {
    /// @notice Emitted when a batch balance check is performed
    event BalancesChecked(address indexed caller, uint256 addressCount);

    /**
     * @dev Returns the ETH balance of a single address.
     * @param account The address to query.
     * @return The balance in wei.
     */
    function getBalance(address account) external view returns (uint256) {
        return account.balance;
    }

    /**
     * @dev Returns the ETH balances for multiple addresses in a single call.
     * @param accounts An array of addresses to query.
     * @return balances An array of balances (in wei) corresponding to each address.
     */
    function getBalances(
        address[] calldata accounts
    ) external view returns (uint256[] memory balances) {
        balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = accounts[i].balance;
        }
    }

    /**
     * @dev Returns the balance of the contract caller.
     * @return The caller's balance in wei.
     */
    function getMyBalance() external view returns (uint256) {
        return msg.sender.balance;
    }
}

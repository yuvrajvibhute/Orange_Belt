// src/App.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock ethers provider
vi.mock('ethers', () => {
    return {
        ethers: {
            isAddress: vi.fn().mockImplementation((address) => {
                return address.startsWith('0x') && address.length === 42;
            }),
            getDefaultProvider: vi.fn().mockReturnValue({
                getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
            }),
            formatEther: vi.fn().mockReturnValue('1.0'),
        }
    };
});

describe('App Component', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders initial state correctly', () => {
        render(<App />);
        expect(screen.getByText('ETH Balance Checker')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Check Balance/i })).toBeDisabled();
    });

    it('shows error on invalid address', async () => {
        render(<App />);
        const input = screen.getByTestId('address-input');
        const button = screen.getByRole('button', { name: /Check Balance/i });

        fireEvent.change(input, { target: { value: 'invalid_address' } });
        expect(button).not.toBeDisabled();

        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid Ethereum address format');
        });
    });

    it('shows loading state and fetches balance', async () => {
        render(<App />);
        const input = screen.getByTestId('address-input');
        const button = screen.getByRole('button', { name: /Check Balance/i });

        // Valid dummy address
        fireEvent.change(input, { target: { value: '0x1234567890123456789012345678901234567890' } });
        fireEvent.click(button);

        // Should show loading text
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

        // After fetch completes, should show result
        await waitFor(() => {
            expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
            expect(screen.getByTestId('result-card')).toBeInTheDocument();
            expect(screen.getByText(/1.0000 ETH/i)).toBeInTheDocument();
        });
    });
});

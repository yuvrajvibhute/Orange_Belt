# ETH Balance Checker dApp 🚀

A simple, fast, and beautifully designed mini-dApp built to check Ethereum addresses' balances on the mainnet. This level completes the mini-dApp requirements, featuring complete loading states, a custom React caching utility, and rigorous unit testing.

## Features ✨
- **Real-time Balance Check:** Fetches Ethereum mainnet balances instantly using `ethers.js`.
- **Intelligent Caching:** Implements local caching with a 5-minute TTL to reduce repetitive RPC calls.
- **Loading & State Indicators:** Premium UI showing exact progress alongside smooth animations.
- **Robust Testing:** Includes 6 tests across 2 suites verifying functionality, caching, and edge cases.
- **Modern Aesthetics:** Glassmorphism UI elements, smooth gradients, and fully responsive design.

## Live Demo & Links 🔗
- **Live Demo Link:** *https://orangebelt1-git-main-yuvraj-vibhutes-projects.vercel.app/*
- **Demo Video Link:** *[Insert Video Demo Link]*
- **Test Output Screenshot:** *(Ss.png )*

## Getting Started 🛠️

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd simple-dapp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Running Tests 🧪
We use Vitest and Testing Library to ensure quality. Run the test suite:
```bash
npm run test
```
All required tests (3+) are fully passing covering initialization, loading stages, and our caching mechanism.

## Tech Stack
- Frontend: React + TypeScript, Vite
- Blockchain: ethers.js
- Testing: Vitest, Testing Library/React
- Styling: Vanilla CSS (Custom Design System)

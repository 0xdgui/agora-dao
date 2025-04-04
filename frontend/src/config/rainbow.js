import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  hardhat,
  sepolia
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const hardhatChain = {
  ...hardhat,
  id: 1337,
  name: 'Hardhat Local',
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
    public: {
      http: ['http://localhost:8545'],
    },
  }
};


export const config = getDefaultConfig({
    appName: 'My RainbowKit App',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    chains: [hardhatChain, sepolia],
    ssr: true, // If your dApp uses server side rendering (SSR)
  });

  export const queryClient = new QueryClient();


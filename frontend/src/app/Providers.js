'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config, queryClient} from '../config/rainbow';


export function ClientProviders({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
      <RainbowKitProvider 
        
        theme={darkTheme({
          accentColor: '#3b82f6',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}
      >
        {children}
      </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
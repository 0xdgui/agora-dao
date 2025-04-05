'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useWatchBlocks } from 'wagmi';
import { CONTRACT_ADDRESSES, HUMA_TOKEN_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import { Wallet } from 'lucide-react';

export function HumaBalance() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [refreshKey, setRefreshKey] = useState(0);

  // Récupérer le solde de tokens HUMA
  const { data: humaBalance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.humaToken,
    abi: HUMA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

  // Surveiller les nouveaux blocs pour rafraîchir le solde
  useWatchBlocks({
    onBlock: () => {
      if (isConnected && address) {
        refetch();
      }
    },
  });

  // Écouter un événement personnalisé pour forcer le rafraîchissement
  useEffect(() => {
    const handleBalanceUpdate = () => {
      setRefreshKey(prevKey => prevKey + 1);
      refetch();
    };

    window.addEventListener('huma-balance-updated', handleBalanceUpdate);
    return () => {
      window.removeEventListener('huma-balance-updated', handleBalanceUpdate);
    };
  }, [refetch]);

  // Force le rafraîchissement quand refreshKey change
  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  if (!isConnected || isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-stone-900 px-3 py-2.5 rounded-md text-sm">
      <Wallet className="h-4 w-4 text-blue-400" />
      <span className="font-medium text-blue-300">
        {humaBalance ? parseFloat(formatEther(humaBalance)).toFixed(2) : '0'} HUMA
      </span>
    </div>
  );
}
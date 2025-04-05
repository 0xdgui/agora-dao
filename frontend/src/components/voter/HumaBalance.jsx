'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useWatchBlocks } from 'wagmi';
import { CONTRACT_ADDRESSES, HUMA_TOKEN_ABI, VAULT_ABI } from '@/config/contracts';
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
  // useWatchBlocks({
  //   onBlock: () => {
  //     if (isConnected && address) {
  //       refetch();
  //     }
  //   },
  // });

  // Configurer l'écoute des événements avec watchContractEvent pour rafraîchir le solde
  useEffect(() => {
    if (!isConnected || !address || !publicClient) return;

    // Écouteur pour l'événement Deposit du Vault
    const unwatchDeposit = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.vault,
      abi: VAULT_ABI,
      eventName: 'Deposit',
      onLogs: (logs) => {
        const relevantLog = logs.find(log => 
          log.args.donor?.toLowerCase() === address?.toLowerCase()
        );
        
        if (relevantLog) {
          refetch();
        }
      },
    });

    // Écouteur pour l'événement TokensBurned
    const unwatchTokensBurned = publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.humaToken,
      abi: HUMA_TOKEN_ABI,
      eventName: 'TokensBurned',
      onLogs: (logs) => {
        const relevantLog = logs.find(log => 
          log.args.from?.toLowerCase() === address?.toLowerCase()
        );
        
        if (relevantLog) {
          refetch();
        }
      },
    });

    // Nettoyage des écouteurs lors du démontage du composant
    return () => {
      unwatchDeposit();
      unwatchTokensBurned();
    };
  }, [address, isConnected, publicClient, refetch]);

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
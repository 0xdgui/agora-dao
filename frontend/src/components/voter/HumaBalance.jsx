'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, HUMA_TOKEN_ABI } from '@/config/contracts';
import { formatEther } from 'viem';
import { Wallet } from 'lucide-react';

export function HumaBalance() {
  const { address, isConnected } = useAccount();

  // Récupérer le solde de tokens HUMA
  const { data: humaBalance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.humaToken,
    abi: HUMA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

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
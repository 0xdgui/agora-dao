// src/hooks/useContractDonation.js
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESSES, VAULT_ABI } from '@/config/contracts';

export function useContractDonation() {
  const [error, setError] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const { writeContract, isPending: isDonating, data: txHash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess(data) {
      setIsSuccessOpen(true);
    },
  });

  const donate = async (amount) => {
    setError(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Veuillez entrer un montant valide");
      return false;
    }

    try {
      // Calculer l'estimation des tokens
      const estimatedTokens = parseFloat(amount) * 300;
      setTokenAmount(estimatedTokens.toFixed(2));
      
      await writeContract({
        address: CONTRACT_ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: 'depositETH',
        value: parseEther(amount),
      });
      
      return true;
    } catch (err) {
      console.error("Erreur lors de la donation:", err);
      setError(err.message || "Une erreur s'est produite lors de la transaction");
      return false;
    }
  };

  return {
    donate,
    isDonating,
    isConfirming,
    isSuccess,
    error,
    tokenAmount,
    isSuccessOpen,
    setIsSuccessOpen,
    setError,
  };
}
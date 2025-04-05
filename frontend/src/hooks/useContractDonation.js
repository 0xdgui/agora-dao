'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESSES, VAULT_ABI, HUMA_TOKEN_ABI } from '@/config/contracts';

export function useContractDonation() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [error, setError] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');

  const { writeContract, isPending: isDonating, data: txHash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receiptData } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Surveiller si la transaction est confirmée
  useEffect(() => {
    const verifyDonation = async () => {
      if (isSuccess && receiptData) {
        console.log("Transaction confirmée avec succès:", receiptData);
        
        try {
          // Vérifier si l'utilisateur est maintenant donateur
          if (publicClient && address) {
            const isDonatorAfter = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.vault,
              abi: VAULT_ABI,
              functionName: 'isAccountDonator',
              args: [address]
            });
            console.log("Utilisateur est donateur après:", isDonatorAfter);
            
            // Vérifier le solde HUMA après le don
            const humaAfter = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.humaToken,
              abi: HUMA_TOKEN_ABI,
              functionName: 'balanceOf',
              args: [address]
            });
            console.log("Solde HUMA après:", formatEther(humaAfter));
          }
          
          // Afficher le message de succès
          setIsSuccessOpen(true);
        } catch (error) {
          console.error("Erreur lors de la vérification post-transaction:", error);
        }
      }
    };
    
    verifyDonation();
  }, [isSuccess, receiptData, address, publicClient]);

  // Surveiller le hash de transaction
  useEffect(() => {
    if (txHash) {
      console.log("Transaction hash reçu:", txHash);
    }
  }, [txHash]);

  // Fonction pour effectuer un don
  const donate = async (amount) => {
    setError(null);
    setDonationAmount(amount);
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Veuillez entrer un montant valide");
      return false;
    }

    try {
      console.log("Tentative de donation:", amount, "ETH");
      console.log("Adresse du contrat Vault:", CONTRACT_ADDRESSES.vault);
      console.log("Adresse de l'utilisateur:", address);
      
      // Vérifications pré-donation si possible
      if (publicClient && address) {
        try {
          // Vérifier si l'utilisateur est déjà donateur avant le don
          const isDonatorBefore = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.vault,
            abi: VAULT_ABI,
            functionName: 'isAccountDonator',
            args: [address]
          });
          console.log("Utilisateur est donateur avant:", isDonatorBefore);
          
          // Vérifier le solde HUMA avant le don
          const humaBefore = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.humaToken,
            abi: HUMA_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address]
          });
          console.log("Solde HUMA avant:", formatEther(humaBefore));
        } catch (checkError) {
          console.warn("Erreur lors des vérifications pré-donation:", checkError);
          // On continue quand même le processus de don
        }
      }
      
      // Calculer l'estimation des tokens
      const estimatedTokens = parseFloat(amount) * 300;
      setTokenAmount(estimatedTokens.toFixed(2));
      
      console.log("Envoi de la transaction avec montant:", parseEther(amount));
      await writeContract({
        address: CONTRACT_ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: 'depositETH',
        value: parseEther(amount),
      });
      
      return true;
    } catch (err) {
      console.error("Erreur détaillée lors de la donation:", err);
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
    donationAmount,
    isSuccessOpen,
    setIsSuccessOpen,
    setError,
  };
}
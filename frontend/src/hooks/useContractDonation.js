'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, decodeEventLog } from 'viem';
import { CONTRACT_ADDRESSES, VAULT_ABI, HUMA_TOKEN_ABI } from '@/config/contracts';

export function useContractDonation() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [error, setError] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');

  const { writeContractAsync, isPending: isDonating, data: txHash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receiptData } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Surveiller si la transaction est confirmée et traiter l'événement Deposit
  useEffect(() => {
    const processDepositEvent = async () => {
      if (isSuccess && receiptData && receiptData.logs) {
        console.log("Transaction confirmée avec succès:", receiptData);
        
        try {
          // Rechercher l'événement Deposit dans les logs
          const depositLogs = receiptData.logs.filter(log => 
            log.address.toLowerCase() === CONTRACT_ADDRESSES.vault.toLowerCase()
          );
          
          if (depositLogs.length > 0) {
            // Essayer de décoder les logs pour trouver l'événement Deposit
            for (const log of depositLogs) {
              try {
                const decodedLog = decodeEventLog({
                  abi: VAULT_ABI,
                  data: log.data,
                  topics: log.topics,
                });
                
                // Vérifier si c'est l'événement Deposit
                if (decodedLog.eventName === 'Deposit') {
                  console.log("Événement Deposit trouvé:", decodedLog);
                  
                  // Extraire les informations de l'événement
                  const { donor, amountETH, valueEUR, tokensAwarded } = decodedLog.args;
                  
                  // S'assurer que cet événement concerne bien l'utilisateur actuel
                  if (donor.toLowerCase() === address.toLowerCase()) {
                    console.log("Tokens attribués:", formatEther(tokensAwarded));
                    setTokenAmount(parseFloat(formatEther(tokensAwarded)).toFixed(2));
                    
                    // Afficher le message de succès
                    setIsSuccessOpen(true);
                  }
                }
              } catch (decodeError) {
                console.warn("Impossible de décoder le log:", decodeError);
              }
            }
          } else {
            console.log("Aucun log du contrat Vault trouvé");
            
            // Utiliser la méthode d'estimation si aucun événement n'est trouvé
            const estimatedTokens = estimateHumaTokens(donationAmount);
            setTokenAmount(estimatedTokens);
            setIsSuccessOpen(true);
          }
        } catch (error) {
          console.error("Erreur lors du traitement des logs:", error);
          // Fallback à l'estimation
          const estimatedTokens = estimateHumaTokens(donationAmount);
          setTokenAmount(estimatedTokens);
          setIsSuccessOpen(true);
        }
      }
    };
    
    processDepositEvent();
  }, [isSuccess, receiptData, address, donationAmount]);

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
      
      // Convertir explicitement la chaîne en nombre avant de passer à parseEther
      const amountNumber = parseFloat(amount).toString();
      const amountInWei = parseEther(amountNumber);
      
      console.log("Montant en Wei:", amountInWei.toString());
      console.log("Contract ABI:", VAULT_ABI);
      console.log("Contract Address:", CONTRACT_ADDRESSES.vault);
      console.log("Function Name:", 'depositETH');
      console.log("Value:", amountInWei.toString());
      
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: 'depositETH',
        value: amountInWei,
      });
      
      return true;
    } catch (err) {
      console.error("Erreur détaillée lors de la donation:", err);
      setError(err.message || "Une erreur s'est produite lors de la transaction");
      return false;
    }
  };
  
  // Fonction d'estimation
  const estimateHumaTokens = (amountEth) => {
    if (!amountEth || parseFloat(amountEth) <= 0) return "0";
    
    const ethEurPrice = 3000;
    const valueEUR = parseFloat(amountEth) * ethEurPrice;

    const baseTokens = valueEUR / 10;
    const bonusTokens = Math.sqrt(valueEUR) * 1e9 / 1e18;

    return (baseTokens + bonusTokens).toFixed(2);
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
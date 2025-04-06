'use client';

import { useState, useEffect } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESSES, GOVERNANCE_ABI } from '@/config/contracts';

export function useProposals() {
  const [activeProposals, setActiveProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const publicClient = usePublicClient();

  // Récupérer les IDs des propositions actives
  const { data: activeProposalIds, isLoading: isLoadingIds, isError, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.governance,
    abi: GOVERNANCE_ABI,
    functionName: 'getActiveProposals',
    enabled: !!publicClient,
  });

  // Récupérer les détails des propositions actives
  useEffect(() => {
    const fetchProposalDetails = async () => {
      setIsLoading(true);
      setError(null);

      if (!activeProposalIds || !activeProposalIds.length || !publicClient) {
        setActiveProposals([]);
        setIsLoading(false);
        return;
      }

      try {
        const proposals = [];
        
        for (const id of activeProposalIds) {
          try {
            // Appel au contrat pour obtenir les détails de la proposition
            const proposalDetails = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.governance,
              abi: GOVERNANCE_ABI,
              functionName: 'getProposalDetails',
              args: [id]
            });

            // Formatage des données retournées par le contrat
            const [
              title,
              description,
              amount,
              recipient,
              votesFor,
              votesAgainst,
              startTime,
              endTime,
              status,
              proposalType
            ] = proposalDetails;

            proposals.push({
              id,
              title,
              description: description.length > 100 ? `${description.substring(0, 100)}...` : description,
              fullDescription: description, 
              amount: amount, 
              amountFormatted: `${formatEther(amount)} ETH`, 
              recipient,
              votesFor: votesFor, 
              votesForFormatted: formatEther(votesFor), 
              votesAgainst: votesAgainst,
              votesAgainstFormatted: formatEther(votesAgainst), 
              startTime: Number(startTime) * 1000, // Timestamp en ms
              startTimeFormatted: new Date(Number(startTime) * 1000).toLocaleDateString(),
              endTime: Number(endTime) * 1000, // Timestamp en ms
              endTimeFormatted: new Date(Number(endTime) * 1000).toLocaleDateString(),
              status: Number(status), // 0 = Active, 1 = Approved, etc.
              statusText: getStatusText(Number(status)),
              proposalType: Number(proposalType), // 0 = Standard, 1 = Emergency
              proposalTypeText: Number(proposalType) === 0 ? 'Standard' : 'Urgence'
            });
          } catch (error) {
            console.error(`Erreur lors de la récupération des détails de la proposition ${id}:`, error);
          }
        }

        setActiveProposals(proposals);
      } catch (err) {
        console.error("Erreur lors de la récupération des propositions:", err);
        setError("Impossible de charger les propositions. Veuillez réessayer plus tard.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoadingIds) {
      fetchProposalDetails();
    }
  }, [activeProposalIds, isLoadingIds, publicClient]);

  // Fonction utilitaire pour convertir le statut numérique en texte
  function getStatusText(status) {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Approuvée';
      case 2: return 'Rejetée';
      case 3: return 'Exécutée';
      case 4: return 'Veto';
      case 5: return 'Expirée';
      default: return 'Inconnu';
    }
  }

  // Fonction pour récupérer une proposition par son ID
  const getProposalById = async (id) => {
    if (!publicClient) {
      throw new Error("Client non disponible");
    }
    
    try {
      const proposalDetails = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.governance,
        abi: GOVERNANCE_ABI,
        functionName: 'getProposalDetails',
        args: [id]
      });
      
      const [
        title,
        description,
        amount,
        recipient,
        votesFor,
        votesAgainst,
        startTime,
        endTime,
        status,
        proposalType
      ] = proposalDetails;
      
      return {
        id,
        title,
        description,
        amount,
        amountFormatted: `${formatEther(amount)} ETH`,
        recipient,
        votesFor,
        votesForFormatted: formatEther(votesFor),
        votesAgainst,
        votesAgainstFormatted: formatEther(votesAgainst),
        startTime: Number(startTime) * 1000,
        startTimeFormatted: new Date(Number(startTime) * 1000).toLocaleDateString(),
        endTime: Number(endTime) * 1000,
        endTimeFormatted: new Date(Number(endTime) * 1000).toLocaleDateString(),
        status: Number(status),
        statusText: getStatusText(Number(status)),
        proposalType: Number(proposalType),
        proposalTypeText: Number(proposalType) === 0 ? 'Standard' : 'Urgence'
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération de la proposition ${id}:`, error);
      throw error;
    }
  };

  return {
    activeProposals,
    isLoading: isLoading || isLoadingIds,
    error,
    refetchProposals: refetch,
    getProposalById
  };
}
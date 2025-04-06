'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, User, Calendar } from 'lucide-react';
import { useProposals } from '@/hooks';
import { CONTRACT_ADDRESSES, HUMA_TOKEN_ABI, GOVERNANCE_ABI } from '@/config/contracts';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { isDonator } = useAuth();
  const { getProposalById } = useProposals();
  
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [voteType, setVoteType] = useState(null); // null, 'for', 'against'
  const [hasVoted, setHasVoted] = useState(false);
  const [userVoteInfo, setUserVoteInfo] = useState({ support: 0, weight: 0 });
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isProposalLoaded, setIsProposalLoaded] = useState(false);
  
  // Récupérer le solde de tokens HUMA
  const { data: humaBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.humaToken,
    abi: HUMA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });
  
  // Vérifier si l'utilisateur a déjà voté
  const { data: voteInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.governance,
    abi: GOVERNANCE_ABI,
    functionName: 'getVoteInfo',
    args: [id, address],
    enabled: isConnected && !!address && !!id,
  });
  
  // Hook pour voter
  const { writeContract, isPending: isVoting, data: txHash } = useWriteContract();
  
  // Suivre la transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // Charger les détails de la proposition
  useEffect(() => {
    // Évite de recharger si déjà fait
    if (isProposalLoaded) return;
    
    const loadProposal = async () => {
      setIsLoading(true);
      try {
        const proposalData = await getProposalById(id);
        setProposal(proposalData);
        setIsProposalLoaded(true);
      } catch (err) {
        console.error("Erreur lors du chargement de la proposition:", err);
        setError("Impossible de charger les détails de la proposition.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      loadProposal();
    }
  }, [id, getProposalById, isProposalLoaded]);
  
  // Mettre à jour les infos de vote de l'utilisateur
  useEffect(() => {
    if (voteInfo) {
      setUserVoteInfo({
        support: Number(voteInfo[0]),
        weight: voteInfo[1]
      });
      setHasVoted(Number(voteInfo[0]) > 0);
    }
  }, [voteInfo]);
  
  // Surveiller la confirmation de la transaction
  useEffect(() => {
    if (isSuccess && txHash) {
      setIsSuccessDialogOpen(true);
      
    }
  }, [isSuccess, txHash]);
  
  // Gérer le vote
  const handleVote = async () => {
    if (!isConnected || !isDonator) {
      console.log("Vote impossible: utilisateur non connecté ou non donateur");
      return;
    }
    
    try {
      if (!voteAmount || parseFloat(voteAmount) <= 0) {
        throw new Error("Veuillez entrer un montant valide");
      }
      
      if (!voteType) {
        throw new Error("Veuillez choisir votre vote");
      }
      
      const amountInWei = parseEther(voteAmount);
      console.log("Montant de vote en Wei:", amountInWei.toString());
      
      if (humaBalance < amountInWei) {
        throw new Error("Solde de tokens HUMA insuffisant");
      }
      
      console.group("Appel à castVote");
      console.log("Adresse du contrat Governance:", CONTRACT_ADDRESSES.governance);
      console.log("ID de la proposition:", id);
      console.log("Vote pour:", voteType === 'for');
      console.log("Montant de tokens:", amountInWei.toString());
      console.groupEnd();
      
      await writeContract({
        address: CONTRACT_ADDRESSES.governance,
        abi: GOVERNANCE_ABI,
        functionName: 'castVote',
        args: [id, voteType === 'for', amountInWei],
      });
      
      console.log("Appel à castVote effectué, hash de transaction:", txHash);
    } catch (err) {
      console.error("Erreur détaillée lors du vote:", err);
      setError(err.message || "Une erreur s'est produite lors du vote");
    }
  };
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-400">Chargement de la proposition...</p>
        </div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card className="p-8 bg-red-900/30 border-red-800 text-center">
          <p className="text-red-200 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Retour</Button>
        </Card>
      </div>
    );
  }
  
  if (!proposal) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
          <p className="text-gray-400 mb-4">Proposition introuvable</p>
          <Button onClick={() => router.push('/dashboard/proposals')}>Voir toutes les propositions</Button>
        </Card>
      </div>
    );
  }
  
  // Calculer les pourcentages de vote
  const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst);
  const forPercentage = totalVotes > 0 ? (Number(proposal.votesFor) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (Number(proposal.votesAgainst) / totalVotes) * 100 : 0;
  
  // Vérifier si la proposition est encore ouverte au vote
  const isOpen = new Date() < new Date(proposal.endTime);
  
  // Calculer le temps restant
  const getRemainingTime = () => {
    if (!isOpen) return "Vote terminé";
    
    const now = new Date();
    const end = new Date(proposal.endTime);
    const diffMs = end - now;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''} et ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} heure${hours > 1 ? 's' : ''} et ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 ">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/dashboard/proposals')}
        className="mb-6 hover:bg-gray-800 cursor-pointer"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux propositions
      </Button>
      
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{proposal.title}</h1>
            <Badge variant={proposal.proposalType === 0 ? "default" : "destructive"}>
              {proposal.proposalTypeText}
            </Badge>
            <Badge 
              variant="outline" 
              className={isOpen 
                ? "bg-green-900/20 text-green-300 border-green-800" 
                : "bg-gray-700"
              }
            >
              {isOpen ? "En cours" : "Terminé"}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              <span>Proposé par: {proposal.proposer || 'Adresse non disponible'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              <span>Créé le: {proposal.startTimeFormatted}</span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {isOpen ? (
                <span>Temps restant: {getRemainingTime()}</span>
              ) : (
                <span>Terminé le: {proposal.endTimeFormatted}</span>
              )}
            </div>
          </div>
        </div>
        
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-300 whitespace-pre-line">{proposal.description}</p>
            </div>
            
            <Separator className="bg-gray-700" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Montant demandé</h3>
                <p className="text-xl font-bold">{proposal.amountFormatted}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400">Destinataire</h3>
                <p className="text-sm font-mono bg-gray-700/50 p-2 rounded truncate">{proposal.recipient}</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Résultats du vote</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-900/20 border border-green-800 rounded-md">
                <div className="flex justify-between">
                  <span className="text-gray-300">Pour</span>
                  <span className="font-bold text-green-400">{forPercentage.toFixed(2)}%</span>
                </div>
                <p className="text-2xl font-bold">{parseFloat(proposal.votesForFormatted).toFixed(2)} HUMA</p>
              </div>
              
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-md">
                <div className="flex justify-between">
                  <span className="text-gray-300">Contre</span>
                  <span className="font-bold text-red-400">{againstPercentage.toFixed(2)}%</span>
                </div>
                <p className="text-2xl font-bold">{parseFloat(proposal.votesAgainstFormatted).toFixed(2)} HUMA</p>
              </div>
            </div>
            
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-200 bg-green-900/30">
                    Pour
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-200 bg-red-900/30">
                    Contre
                  </span>
                </div>
              </div>
              <div className="flex h-4 mb-4 overflow-hidden rounded-full bg-gray-700">
                <div
                  style={{ width: `${forPercentage}%` }}
                  className="flex flex-col justify-center bg-green-500 text-center text-white shadow-none"
                ></div>
                <div
                  style={{ width: `${againstPercentage}%` }}
                  className="flex flex-col justify-center bg-red-500 text-center text-white shadow-none"
                ></div>
              </div>
            </div>
            
            {hasVoted && (
              <div className="bg-blue-900/30 border border-blue-800 p-4 rounded-md">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-300">Vous avez déjà voté</h3>
                    <p className="mt-1 text-sm text-blue-200">
                      Vous avez voté 
                      <span className={userVoteInfo.support === 1 ? "text-green-400" : "text-red-400"}>
                        {userVoteInfo.support === 1 ? " pour " : " contre "}
                      </span>
                      cette proposition avec {formatEther(userVoteInfo.weight)} tokens HUMA.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {isConnected && isDonator && isOpen && !hasVoted && (
          <Card className="p-6 bg-gray-800/50 border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Voter</h2>
            
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/50 border border-red-800 p-3 rounded text-sm text-red-200 flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="voteAmount" className="text-sm font-medium">
                  Montant de tokens HUMA à utiliser pour voter
                </Label>
                <div className="relative">
                  <Input
                    id="voteAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 pr-16"
                    placeholder="0.0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    HUMA
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Solde disponible: {humaBalance ? formatEther(humaBalance) : '0'} HUMA
                </p>
                <p className="text-xs text-gray-400">
                  Remarque: Les tokens utilisés pour voter seront brûlés.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Button
                  variant={voteType === 'for' ? "default" : "outline"}
                  className={voteType === 'for' ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer" : ""}
                  onClick={() => setVoteType('for')}
                >
                  Voter pour
                </Button>
                <Button
                  variant={voteType === 'against' ? "default" : "outline"}
                  className={voteType === 'against' ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer" : ""}
                  onClick={() => setVoteType('against')}
                >
                  Voter contre
                </Button>
              </div>
              
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4 text-white cursor-pointer"
                disabled={!voteAmount || parseFloat(voteAmount) <= 0 || !voteType || isVoting || isConfirming}
                onClick={handleVote}
              >
                {isVoting || isConfirming ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full border-2 border-b-transparent border-white animate-spin mr-2" />
                    {isVoting ? 'Vote en cours...' : 'Confirmation...'}
                  </div>
                ) : (
                  'Confirmer le vote'
                )}
              </Button>
            </div>
          </Card>
        )}
        
        {(!isConnected || !isDonator) && isOpen && (
          <Card className="p-6 bg-gray-800/50 border-gray-700 text-center">
            <h2 className="text-xl font-semibold mb-4">Participer au vote</h2>
            <p className="text-gray-400 mb-6">
              {!isConnected
                ? "Connectez votre portefeuille pour participer au vote"
                : "Vous devez être donateur pour pouvoir voter"
              }
            </p>
            <Button asChild>
              <Link href={!isConnected ? "/" : "/dashboard/donate"}>
                {!isConnected ? "Connecter le portefeuille" : "Faire un don"}
              </Link>
            </Button>
          </Card>
        )}
        
        {!isOpen && proposal.status === 1 && (
          <Card className="p-6 bg-green-900/20 border-green-800">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
              <div className="ml-3">
                <h3 className="text-lg font-medium text-green-300">Proposition approuvée</h3>
                <p className="mt-1 text-green-200">
                  Cette proposition a été approuvée et peut maintenant être exécutée pour transférer les fonds.
                </p>
                {isDonator && (
                  <Button className="mt-4 bg-green-700 hover:bg-green-800">
                    Exécuter la proposition
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
        
        {!isOpen && proposal.status === 2 && (
          <Card className="p-6 bg-red-900/20 border-red-800">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-300">Proposition rejetée</h3>
                <p className="mt-1 text-red-200">
                  Cette proposition a été rejetée et ne peut pas être exécutée.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Dialogue de confirmation de vote */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              Vote enregistré avec succès!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Votre vote a été enregistré sur la blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-700/50 p-4 rounded-md mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Vote</p>
                <p className="font-bold">{voteType === 'for' ? 'Pour' : 'Contre'}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Tokens utilisés</p>
                <p className="text-xl font-bold text-blue-400">{voteAmount} HUMA</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-300">
              Vos tokens HUMA ont été brûlés durant ce processus de vote. La page va se rafraîchir automatiquement.
            </p>
          </div>
          <Button 
            onClick={() => setIsSuccessDialogOpen(false)} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
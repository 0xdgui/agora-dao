'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CONTRACT_ADDRESSES, GOVERNANCE_ABI, VAULT_ABI } from '@/config/contracts';
import { CheckCircle2 } from 'lucide-react';

export default function CreateProposalPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  const [vaultBalance, setVaultBalance] = useState('0');
  const [isAccountDonator, setIsAccountDonator] = useState(false);
  
  // Vérifier si l'utilisateur est donateur et obtenir le solde du vault
  const { data: isDonator, isLoading: isDonatorLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: 'isAccountDonator',
    args: [address],
    enabled: isConnected && !!address,
  });
  
  const { data: balance, isLoading: isBalanceLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: 'getVaultBalance',
    enabled: isConnected,
  });
  
  // Mettre à jour les états lorsque les données sont chargées
  useEffect(() => {
    if (balance) {
      setVaultBalance(formatEther(balance));
    }
    if (isDonator !== undefined) {
      setIsAccountDonator(isDonator);
    }
  }, [balance, isDonator]);

  // Hook pour créer une proposition
  const { writeContract, isPending: isCreating, data: txHash } = useWriteContract();

  // Suivre la transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Surveiller la confirmation de la transaction
  useEffect(() => {
    if (isSuccess && txHash) {
      // Simuler la récupération de l'ID de la proposition (normalement via un événement)
      // En production, on récupérerait l'ID depuis les logs de la transaction
      setProposalId(`0x${Math.random().toString(16).slice(2, 10)}...`);
      setIsSuccessOpen(true);
    }
  }, [isSuccess, txHash]);

  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation des champs
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!description.trim()) {
      setError("La description est requise");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Le montant doit être supérieur à 0");
      return;
    }
    if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("L'adresse du destinataire n'est pas valide");
      return;
    }
    if (parseFloat(amount) > parseFloat(vaultBalance)) {
      setError(`Le montant demandé (${amount} ETH) est supérieur au solde du vault (${vaultBalance} ETH)`);
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.governance,
        abi: GOVERNANCE_ABI,
        functionName: 'createProposal',
        args: [title, description, parseEther(amount), recipient],
      });
    } catch (err) {
      console.error("Erreur lors de la création de la proposition:", err);
      setError(err.message || "Une erreur s'est produite lors de la création de la proposition");
    }
  };

  // Si l'utilisateur n'est pas donateur, afficher un message
  if (isConnected && !isDonatorLoading && !isAccountDonator) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card className="p-8 bg-gray-800/50 border-gray-700 text-center">
          <h1 className="text-2xl font-bold mb-4">Devenir donateur</h1>
          <p className="text-gray-400 mb-6">
            Vous devez faire un don pour obtenir des tokens HUMA et pouvoir créer des propositions.
          </p>
          <Button asChild>
            <a href="/dashboard/donate">Faire un don</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Créer une proposition</h1>
        <p className="text-gray-400 mt-2">
          Proposez un financement pour un projet qui soutient notre mission humanitaire.
        </p>
      </div>

      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Titre de la proposition
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Financement pour le projet d'aide humanitaire en Haïti"
              className="bg-gray-700 border-gray-600"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description détaillée
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez en détail l'objectif du projet, l'utilisation des fonds et l'impact attendu..."
              className="min-h-[150px] bg-gray-700 border-gray-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Montant demandé (ETH)
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border-gray-600 pr-12"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                  ETH
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Solde du vault: {vaultBalance} ETH
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient" className="text-sm font-medium">
                Adresse du destinataire
              </Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="bg-gray-700 border-gray-600 font-mono"
                required
              />
              <p className="text-xs text-gray-400">
                Adresse ETH qui recevra les fonds
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-800 p-3 rounded text-sm text-red-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!isConnected || isCreating || isConfirming || !isAccountDonator}
          >
            {isCreating || isConfirming ? (
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-b-transparent border-white animate-spin mr-2" />
                {isCreating ? 'Création en cours...' : 'Confirmation...'}
              </div>
            ) : (
              'Soumettre la proposition'
            )}
          </Button>
        </form>
      </Card>

      <div className="mt-8 space-y-4 text-sm text-gray-400">
        <div>
          <h3 className="font-medium text-white">Comment fonctionne le processus?</h3>
          <p className="mt-1">
            Une fois soumise, votre proposition sera ouverte au vote pendant 7 jours. Les membres de la DAO pourront voter pour ou contre en utilisant leurs tokens HUMA.
          </p>
        </div>
        <div>
          <h3 className="font-medium text-white">Quorum requis</h3>
          <p className="mt-1">
            Pour qu'une proposition soit validée, elle doit obtenir un quorum de participation qui dépend du montant demandé et une majorité de votes favorables.
          </p>
        </div>
      </div>

      {/* Dialogue de succès */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
              Proposition créée avec succès!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Votre proposition a été enregistrée sur la blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-700/50 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-400">ID de la proposition</p>
              <p className="font-mono text-sm">{proposalId}</p>
            </div>
            
            <p className="text-sm text-gray-400">
              Votre proposition est maintenant ouverte au vote pour une période de 7 jours. Vous pouvez suivre son avancement et les votes dans la section des propositions.
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={() => {
                setIsSuccessOpen(false);
                router.push('/dashboard/proposals');
              }} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Voir les propositions
            </Button>
            <Button 
              onClick={() => {
                setIsSuccessOpen(false);
                setTitle('');
                setDescription('');
                setAmount('');
                setRecipient('');
              }} 
              variant="outline"
              className="flex-1"
            >
              Créer une autre proposition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
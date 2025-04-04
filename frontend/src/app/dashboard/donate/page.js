'use client';

import { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContractDonation } from '@/hooks';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CONTRACT_ADDRESSES, VAULT_ABI } from '@/config/contracts';

export default function DonatePage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [error, setError] = useState(null);
  

  // Récupérer le solde ETH de l'utilisateur
  const { data: balance } = useBalance({
    address,
    enabled: isConnected && !!address,
  });

  // Utilisation du hook pour écrire au contrat
  const { writeContract, isPending: isDonating, data: txHash } = useWriteContract();

  

  // Attendre la confirmation de la transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess(data) {
      // Simuler le nombre de tokens reçus (à remplacer par un calcul réel ou un événement)
      const estimatedTokens = parseFloat(amount) * 300; // Simplification du calcul
      setTokenAmount(estimatedTokens.toFixed(2));
      setIsSuccessOpen(true);
      setAmount(''); // Réinitialiser le montant
    },
  });

  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      setError("Veuillez entrer un montant valide");
      return;
    }
    
    if (!isConnected) {
      setError("Veuillez connecter votre portefeuille");
      return;
    }

    try {
      console.log("Tentative d'envoi de la transaction...");
      console.log("Valeur en ETH:", parseEther(amount));
      
      const result = await writeContract({
        address: CONTRACT_ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: 'depositETH',
        value: parseEther(amount),
      });
      
      console.log("Transaction envoyée:", result);
    } catch (err) {
      console.error("Erreur détaillée:", err);
      setError(err.message || "Une erreur s'est produite lors de la transaction");
    }
  };

  // Préréglages pour les montants
  const presets = ['0.1', '0.5', '1', '5'];

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Faire un don</h1>
        <p className="text-gray-400">
          Soutenez la DAO en faisant un don en ETH et recevez des tokens HUMA pour participer à la gouvernance.
        </p>
      </div>

      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium">
              Montant (ETH)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.0"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                ETH
              </div>
            </div>
            {balance && (
              <p className="text-xs text-gray-400 text-right">
                Solde: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset)}
                className="flex-1"
              >
                {preset} ETH
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Vous recevrez (estimation)</h3>
            <div className="bg-gray-700/50 p-4 rounded-md">
              <p className="text-xl font-bold">
                {amount ? (parseFloat(amount) * 300).toFixed(2) : '0'} HUMA
              </p>
              <p className="text-xs text-gray-400 mt-1">
                La quantité exacte peut varier selon le prix ETH/EUR au moment de la transaction
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
            disabled={!amount || parseFloat(amount) <= 0 || isDonating || isConfirming}
          >
            {isDonating || isConfirming ? (
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-b-transparent border-white animate-spin mr-2" />
                {isDonating ? 'Envoi en cours...' : 'Confirmation...'}
              </div>
            ) : (
              'Faire un don'
            )}
          </Button>
        </form>
      </Card>

      <div className="text-sm text-gray-400 space-y-4">
        <div>
          <h3 className="font-medium text-white">Comment ça marche ?</h3>
          <p className="mt-1">
            Vos ETH sont convertis en EUR puis des tokens HUMA sont mintés selon une formule qui favorise les petits donateurs.
          </p>
        </div>
        <div>
          <h3 className="font-medium text-white">Qu&apos;est-ce que les tokens HUMA ?</h3>
          <p className="mt-1">
            Les tokens HUMA vous permettent de voter sur les propositions de la DAO. Ils sont brûlés lors du vote.
          </p>
        </div>
      </div>

      {/* Dialogue de succès */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Don effectué avec succès !</DialogTitle>
            <DialogDescription className="text-gray-400">
              Votre don a été enregistré sur la blockchain.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-700/50 p-4 rounded-md mb-4">
              <p className="text-sm text-gray-400">Vous avez reçu</p>
              <p className="text-2xl font-bold">{tokenAmount} HUMA</p>
            </div>
            <p className="text-sm text-gray-400">
              Vous pouvez maintenant participer aux votes de gouvernance et créer des propositions.
            </p>
          </div>
          <Button onClick={() => setIsSuccessOpen(false)} className="w-full bg-blue-600 hover:bg-blue-700">
            Continuer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
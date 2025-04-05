'use client';

import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Check as CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useContractDonation } from '@/hooks/useContractDonation';

export default function DonatePage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  
  // Utiliser le hook personnalisé
  const { 
    donate, 
    isDonating, 
    isConfirming, 
    error, 
    tokenAmount, 
    isSuccessOpen, 
    setIsSuccessOpen,
    setError
  } = useContractDonation();

  // Récupérer le solde ETH de l'utilisateur
  const { data: balance } = useBalance({
    address,
    enabled: isConnected && !!address,
  });

  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError("Veuillez connecter votre portefeuille");
      return;
    }

    // Utilise la fonction donate du hook
    const success = await donate(amount);
    // La réinitialisation du montant se fera après confirmation
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
            disabled={!amount || parseFloat(amount) <= 0 || isDonating || isConfirming || !isConnected}
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
            <DialogTitle className="flex items-center text-xl">
              <div className="bg-green-500 rounded-full p-2 mr-3">
                <CheckIcon className="h-6 w-6 text-white" />
              </div>
              Don effectué avec succès !
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Votre don a été enregistré sur la blockchain et les tokens ont été ajoutés à votre portefeuille.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-700/50 p-4 rounded-md mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Montant envoyé</p>
                <p className="font-bold">{amount} ETH</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Tokens reçus</p>
                <p className="text-xl font-bold text-blue-400">{tokenAmount} HUMA</p>
              </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-800 p-3 rounded-md">
              <p className="text-sm text-blue-200">
                <span className="font-bold">Félicitations!</span> Vous êtes maintenant un membre actif d&apos;AgoraDAO. 
                Vous pouvez participer aux votes de gouvernance et créer des propositions.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={() => {
                setIsSuccessOpen(false);
                setAmount(''); // Réinitialiser le montant après fermeture
              }} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Fermer
            </Button>
            <Button 
              onClick={() => {
                setIsSuccessOpen(false);
                setAmount('');
                // Rediriger vers la page des propositions
                window.location.href = '/dashboard/proposals';
              }} 
              variant="outline"
              className="flex-1"
            >
              Voir les propositions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
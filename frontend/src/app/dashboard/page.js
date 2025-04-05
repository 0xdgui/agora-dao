'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  CONTRACT_ADDRESSES, 
  HUMA_TOKEN_ABI, 
  VAULT_ABI 
} from '@/config/contracts';
import { formatEther } from 'viem';
import { useProposals } from '@/hooks';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { isDonator, isLoading: isAuthLoading } = useAuth();

  // Récupérer le solde de tokens HUMA
  const { data: humaBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.humaToken,
    abi: HUMA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

  // Récupérer le solde du vault
  const { data: vaultBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.vault,
    abi: VAULT_ABI,
    functionName: 'getVaultBalance',
    enabled: isConnected,
  });

  // Utiliser le hook useProposals pour récupérer les propositions
  const { activeProposals, isLoading: isProposalsLoading, error: proposalsError } = useProposals();

  // Déterminer si la page est en chargement
  const isLoading = isAuthLoading || isProposalsLoading;

  // Afficher un message de chargement pendant la vérification du statut de donateur
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté ou n'est pas un donateur
  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Card className="p-6 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Connectez votre portefeuille</h2>
          <p className="text-gray-400 mb-6">
            Vous devez connecter votre portefeuille pour accéder au dashboard.
          </p>
          <Button asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!isDonator) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)] ">
        <Card className="p-6 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Devenez donateur</h2>
          <p className="text-gray-400 mb-6">
            Vous devez faire un don pour obtenir des tokens HUMA et participer à la gouvernance.
          </p>
          <Button asChild>
            <Link href="/dashboard/donate">Faire un don</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Vos tokens HUMA" 
          value={humaBalance ? formatEther(humaBalance) : '0'}
          description="Tokens de gouvernance"
          icon="🪙"
        />
        <StatCard 
          title="Trésorerie DAO" 
          value={vaultBalance ? `${formatEther(vaultBalance)} ETH` : '0 ETH'} 
          description="Fonds disponibles"
          icon="💰"
        />
        <StatCard 
          title="Propositions actives" 
          value={activeProposals?.length || 0} 
          description="En attente de vote"
          icon="📝"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Propositions actives</h2>
          <Button asChild variant="outline">
            <Link href="/dashboard/proposals">Voir toutes</Link>
          </Button>
        </div>
        
        {proposalsError ? (
          <Card className="p-8 text-center bg-red-900/30 border-red-800">
            <p className="text-red-200">{proposalsError}</p>
          </Card>
        ) : activeProposals && activeProposals.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {activeProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-gray-800/50">
            <p className="text-gray-400">Aucune proposition active pour le moment.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/create">Créer une proposition</Link>
            </Button>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            title="Faire un don"
            description="Envoyez des ETH et recevez des tokens HUMA"
            icon="💸"
            href="/dashboard/donate"
          />
          <ActionCard
            title="Créer une proposition"
            description="Proposez un financement pour un projet"
            icon="✨"
            href="/dashboard/create"
          />
          <ActionCard
            title="Voter"
            description="Participez aux décisions de gouvernance"
            icon="🗳️"
            href="/dashboard/proposals"
          />
        </div>
      </div>
    </div>
  );
}

// Composant pour afficher une carte de statistique
function StatCard({ title, value, description, icon }) {
  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700 overflow-hidden relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </Card>
  );
}

// Composant pour afficher une carte de proposition
function ProposalCard({ proposal }) {
  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">{proposal.title}</h3>
          <p className="text-gray-400 text-sm mt-1 truncate max-w-md">
            {proposal.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm bg-gray-700 px-2 py-0.5 rounded-full">
              {proposal.amountFormatted}
            </span>
            <span className="text-sm text-gray-400">
              Fin: {proposal.endTimeFormatted}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center">
              <span className="text-green-400 mr-1">👍</span>
              <span>{proposal.votesForFormatted}</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-400 mr-1">👎</span>
              <span>{proposal.votesAgainstFormatted}</span>
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/proposals/${proposal.id}`}>Voter</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Composant pour afficher une carte d'action
function ActionCard({ title, description, icon, href }) {
  return (
    <Link href={href}>
      <Card className="p-6 bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 transition-colors h-full">
        <div className="flex items-start gap-4">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
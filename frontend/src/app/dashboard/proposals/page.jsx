'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { useProposals } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { ProposalCard } from '@/components/proposal/ProposalCard';

export default function ProposalsPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isDonator } = useAuth();
  const { activeProposals, isLoading, error } = useProposals();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('endTime'); // 'endTime', 'amount', 'votes'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
  // Filtrer les propositions par terme de recherche
  const filteredProposals = activeProposals.filter(proposal => 
    proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposal.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Trier les propositions
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    if (sortBy === 'endTime') {
      return sortDirection === 'asc' 
        ? a.endTime - b.endTime 
        : b.endTime - a.endTime;
    } 
    else if (sortBy === 'amount') {
      return sortDirection === 'asc' 
        ? Number(a.amount) - Number(b.amount) 
        : Number(b.amount) - Number(a.amount);
    } 
    else if (sortBy === 'votes') {
      const totalVotesA = Number(a.votesFor) + Number(a.votesAgainst);
      const totalVotesB = Number(b.votesFor) + Number(b.votesAgainst);
      return sortDirection === 'asc' 
        ? totalVotesA - totalVotesB 
        : totalVotesB - totalVotesA;
    }
    return 0;
  });
  
  // Fonction pour changer le tri
  const handleSortChange = (value) => {
    if (value === sortBy) {
      // Inverser la direction si on clique sur le même critère
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(value);
      setSortDirection('desc'); // Par défaut en ordre décroissant pour un nouveau critère
    }
  };
  
  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-400">Chargement des propositions...</p>
        </div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <Card className="p-8 bg-red-900/30 border-red-800 text-center">
          <p className="text-red-200 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Propositions</h1>
          <p className="text-gray-400 mt-1">
            Consultez et votez sur les propositions actives de la DAO
          </p>
        </div>
        
        {isConnected && isDonator && (
          <Button onClick={() => router.push('/dashboard/create')} className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Créer une proposition
          </Button>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher une proposition..."
            className="pl-10 bg-gray-800/50 border-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSortChange('endTime')}
            className={`flex items-center gap-1 ${sortBy === 'endTime' ? 'border-blue-500' : ''}`}
          >
            Date
            <ArrowUpDown className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleSortChange('amount')}
            className={`flex items-center gap-1 ${sortBy === 'amount' ? 'border-blue-500' : ''}`}
          >
            Montant
            <ArrowUpDown className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleSortChange('votes')}
            className={`flex items-center gap-1 ${sortBy === 'votes' ? 'border-blue-500' : ''}`}
          >
            Votes
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4 bg-gray-800/50">
          <TabsTrigger value="active" className="flex-1">Actives</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">Toutes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {sortedProposals.length > 0 ? (
            <div className="space-y-4">
              {sortedProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center bg-gray-800/50 border-gray-700">
              <p className="text-gray-400 mb-4">Aucune proposition active pour le moment.</p>
              {isConnected && isDonator && (
                <Button asChild>
                  <Link href="/dashboard/create">Créer une proposition</Link>
                </Button>
              )}
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="all">
          {sortedProposals.length > 0 ? (
            <div className="space-y-4">
              {sortedProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center bg-gray-800/50 border-gray-700">
              <p className="text-gray-400">Aucune proposition n&apos;a été créée pour le moment.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

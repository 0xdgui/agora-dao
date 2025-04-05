'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Link from 'next/link';


export function ProposalCard({ proposal }) {
    // Calculer le pourcentage de votes pour et contre
    const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst);
    const forPercentage = totalVotes > 0 ? (Number(proposal.votesFor) / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (Number(proposal.votesAgainst) / totalVotes) * 100 : 0;
    
    // Vérifier si la proposition est encore ouverte au vote
    const isOpen = new Date() < new Date(proposal.endTime);
    
    // Calculer le temps restant
    const timeRemaining = isOpen 
      ? getTimeRemaining(new Date(proposal.endTime)) 
      : "Vote terminé";
    
    return (
      <Link href={`/dashboard/proposals/${proposal.id}`}>
        <Card className="p-5 bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 transition-colors my-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{proposal.title}</h3>
                <Badge variant={proposal.proposalType === 0 ? "default" : "destructive"} className="ml-2">
                  {proposal.proposalTypeText}
                </Badge>
                {isOpen ? (
                  <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-800">
                    {timeRemaining}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-700">
                    Terminé
                  </Badge>
                )}
              </div>
              
              <p className="text-gray-400 text-sm truncate max-w-2xl">
                {proposal.description}
              </p>
              
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-400">
                  Montant: <span className="text-white font-medium">{proposal.amountFormatted}</span>
                </span>
                <span className="text-gray-400">
                  Fin: <span className="text-white font-medium">{proposal.endTimeFormatted}</span>
                </span>
              </div>
            </div>
            
            <div className="w-full lg:w-48">
              <div className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Pour: {parseFloat(proposal.votesForFormatted).toFixed(2)}</span>
                  <span className="text-red-400">Contre: {parseFloat(proposal.votesAgainstFormatted).toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${forPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{forPercentage.toFixed(0)}%</span>
                  <span>{againstPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );

      // Fonction utilitaire pour formater le temps restant
  function getTimeRemaining(endTime) {
    const total = endTime - new Date();
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}j ${hours}h restants`;
    } else if (hours > 0) {
      return `${hours}h restantes`;
    } else {
      const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}min restantes`;
    }
  }

  }
  

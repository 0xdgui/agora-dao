'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [isDonator, setIsDonator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Vérifier si l'utilisateur est un donateur (à compléter avec l'appel au contrat)
  useEffect(() => {
    const checkDonatorStatus = async () => {
      if (isConnected && address) {
        try {
          // simule que tous les utilisateurs connectés sont des donateurs
          setIsDonator(true);
          setIsLoading(false);
        } catch (error) {
          console.error("Erreur lors de la vérification du statut de donateur:", error);
          setIsDonator(false);
          setIsLoading(false);
        }
      } else {
        setIsDonator(false);
        setIsLoading(false);
      }
    };

    checkDonatorStatus();
  }, [isConnected, address]);

  // Rediriger vers la page d'accueil si déconnecté
  useEffect(() => {
    if (!isLoading && !isConnected && window.location.pathname !== '/') {
      router.push('/');
    }
  }, [isConnected, isLoading, router]);

  return (
    <AuthContext.Provider value={{ address, isConnected, isDonator, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
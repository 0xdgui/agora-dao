'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-6xl font-bold text-white">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300">Page non trouvée</h2>
        <p className="text-gray-400">
          Désolé, la page que vous recherchez semble avoir été déplacée ou n&apos;existe pas.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => router.back()} variant="outline">
            Retour
          </Button>
          <Button asChild>
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
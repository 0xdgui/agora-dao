// src/app/dashboard/layout.js
'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LucideVote,
  PlusCircle,
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { HumaBalance } from '@/components/voter/HumaBalance';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Propositions', href: '/dashboard/proposals', icon: LucideVote },
    { name: 'Créer proposition', href: '/dashboard/create', icon: PlusCircle },
    { name: 'Faire un don', href: '/dashboard/donate', icon: Wallet },
  ];

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Mobile navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="fixed top-4 left-4 z-50"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-gray-800 border-gray-700 p-0">
            <nav className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold">AgoraDAO</h2>
              </div>
              <div className="flex-1 py-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm ${
                      pathname === item.href
                        ? 'bg-purple-900/50 text-purple-200'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop navigation */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex flex-col h-full bg-gray-800 border-r border-gray-700">
            <div className="flex h-16 items-center px-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">AgoraDAO</h2>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-6 py-3 text-sm ${
                    pathname === item.href
                      ? 'bg-blue-900/80 text-blue-200'
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-72">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-700 bg-gray-800 px-4 sm:px-6 lg:px-8">
            <h1 className="text-lg font-semibold lg:hidden">AgoraDAO</h1>
            <div className="flex flex-1 items-center justify-end gap-x-4">
              <HumaBalance />
              <ConnectButton className="lg:hidden" />
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
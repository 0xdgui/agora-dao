import { Inter } from 'next/font/google';
import './globals.css';
import { ClientProviders } from './Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AgoraDAO - Plateforme de gouvernance humanitaire',
  description: 'Plateforme de gouvernance décentralisée pour des projets humanitaires',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
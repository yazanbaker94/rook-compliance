import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import './styles.css';

const manrope = Manrope({ variable: '--font-humanist', subsets: ['latin'] });
const plexMono = IBM_Plex_Mono({ variable: '--font-technical', subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: 'Rook Compliance | Environmental operations, connected',
  description: 'A traceable compliance operations platform connecting office teams and field inspectors.',
  icons: { icon: '/corvus/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${manrope.variable} ${plexMono.variable}`}>{children}</body></html>;
}

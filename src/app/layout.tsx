import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'TaskNest', template: '%s · TaskNest' },
  description:
    'One workspace for every customer conversation, with an AI agent that answers from your own knowledge.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-sm">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

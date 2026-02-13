import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'ArtiCard - 学んで集める、AIカードコレクション',
  description:
    'AIが生成する記事からユニークなコレクティブルカードを作成。学びながらカードを集める新しい体験。',
  metadataBase: new URL('https://articard.app'),
  openGraph: {
    title: 'ArtiCard - 学んで集める、AIカードコレクション',
    description:
      'AIが生成する記事からユニークなコレクティブルカードを作成。学びながらカードを集める新しい体験。',
    url: 'https://articard.app',
    siteName: 'ArtiCard',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArtiCard - 学んで集める、AIカードコレクション',
    description:
      'AIが生成する記事からユニークなコレクティブルカードを作成。学びながらカードを集める新しい体験。',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

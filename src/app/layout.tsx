import type { Metadata } from 'next';
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from '@/lib/config/theme';
import './globals.css';
import './styles/correction.css';

const title = 'Languify';
const description = 'Practice your language skills with AI';
const image = {
  url: '/branding/social-preview.png',
  width: 1734,
  height: 907,
  alt: 'Languify: practice languages with AI',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://chat.ouchta.com',
  ),
  title,
  description,
  openGraph: {
    type: 'website',
    title,
    description,
    images: [image],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [image],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

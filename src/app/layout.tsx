import type { Metadata } from 'next';
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from '@/lib/config/theme';
import './globals.css';
import './styles/correction.css';

export const metadata: Metadata = {
  title: 'LangBot',
  description: 'practice your language skills with AI',
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

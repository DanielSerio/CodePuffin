import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CodePuffin Next.js Test',
  description: 'Test app for architectural enforcement',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: '2rem' }}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Cadence — Your interview, rehearsed.', description: 'Practice interviews built around your experience. Find your rhythm with relevant questions, thoughtful feedback, and moments to revisit.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{
    children: React.ReactNode;
}>) { return <html lang="en"><body>{children}</body></html>; }

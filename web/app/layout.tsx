import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Cadence — Interviews that run like clockwork.', description: 'Practice interviews built around your experience. Find your rhythm with relevant questions, thoughtful feedback, and moments to revisit.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{
    children: React.ReactNode;
}>) { return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"/><link rel="stylesheet" href="/assets/gate.css"/><link rel="stylesheet" href="/assets/interview.css"/><link rel="stylesheet" href="/assets/animation-controls.css"/><link rel="stylesheet" href="/assets/session.css"/></head><body>{children}</body></html>; }

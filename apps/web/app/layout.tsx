import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeTrace | Interactive Memory & Query Execution Visualizer',
  description: 'Interactive execution visualizer for C/C++ memory pointers, data structures, and PostgreSQL query execution plans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0d14] text-slate-100 min-h-screen selection:bg-blue-600/30">
        {children}
      </body>
    </html>
  );
}

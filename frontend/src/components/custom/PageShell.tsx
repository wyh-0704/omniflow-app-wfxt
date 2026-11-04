import { ReactNode } from 'react';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import AppNav from '@/components/custom/AppNav';
import { Toaster } from '@/components/ui/sonner';

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/5 to-transparent" />
      <AppNav />
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <OmniflowBadge />
      <Toaster />
    </div>
  );
}
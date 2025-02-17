// src/app/(protected)/layout.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { useAuth } from '@/hooks/use-auth';

const protectedLinks = ['dashboard', 'videos', 'extract'];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user } = useAuth();

  console.log('🛡️ ProtectedLayout: Current status:', status);
  console.log('🛡️ ProtectedLayout: User:', user);

  useEffect(() => {
    console.log('🛡️ ProtectedLayout useEffect: Status changed to:', status);
    if (status === 'unauthenticated') {
      console.log('🛡️ ProtectedLayout: Redirecting to login...');
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    console.log('🛡️ ProtectedLayout: Showing loading spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    console.log('🛡️ ProtectedLayout: Returning null for unauthenticated state');
    return null;
  }

  console.log('🛡️ ProtectedLayout: Rendering protected content');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Nav links={protectedLinks} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

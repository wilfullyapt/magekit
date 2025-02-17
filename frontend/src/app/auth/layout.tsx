// src/app/(auth)/layout.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  // Handle redirect when authenticated using useEffect
  useEffect(() => {
    if (status === 'authenticated') {
      console.log('🔐 AuthLayout: User is authenticated, redirecting to dashboard...');
      router.push('/protected/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    console.log('🔐 AuthLayout: Showing loading spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (status === 'authenticated') {
    console.log('🔐 AuthLayout: Returning null while authenticated...');
    return null;
  }

  console.log('🔐 AuthLayout: Rendering auth content...');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6">
        <div className="relative bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

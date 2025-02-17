// src/app/auth/login/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/forms/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get('signup') === 'success';
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/protected/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <>
      {signupSuccess && (
        <div className="mb-6">
          <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
            <AlertDescription className="text-green-800 dark:text-green-200">
              Account created successfully! Please log in.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <LoginForm />
    </>
  );
}

// src/hooks/use-auth.ts

import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import type { AuthContextType } from '@/providers/AuthProvider';

export function useAuth(): AuthContextType & {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return {
    ...context,
    isAuthenticated: context.status === 'authenticated',
    isLoading: context.status === 'loading',
  };
}

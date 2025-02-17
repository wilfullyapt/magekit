// src/providers/AuthProvider.tsx
'use client';

import { createContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { User } from '@/types/auth';
import api from '@/lib/axios';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
}

export type AuthAction =
  | { type: 'AUTHENTICATED'; user: User }
  | { type: 'UNAUTHENTICATED' }
  | { type: 'LOADING' };

export interface AuthContextType extends AuthState {
  checkAuth: () => Promise<void>;
  dispatch: (action: AuthAction) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  status: 'loading',
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  console.log('🔑 Auth Reducer:', { type: action.type, currentStatus: state.status });
  switch (action.type) {
    case 'AUTHENTICATED':
      return { status: 'authenticated', user: action.user };
    case 'UNAUTHENTICATED':
      return { status: 'unauthenticated', user: null };
    case 'LOADING':
      return { ...state, status: 'loading' };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const checkingAuth = useRef(false);
  const checkAuthTimeoutRef = useRef<NodeJS.Timeout>();

  const checkAuth = useCallback(async () => {
    if (checkingAuth.current) return;
    checkingAuth.current = true;

    try {
      const response = await api.get('/api/auth/status');
      if (response.data.user) {
        dispatch({ type: 'AUTHENTICATED', user: response.data.user });
      } else {
        throw new Error('No user data');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = document.cookie.includes('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const refreshResponse = await api.post('/api/auth/refresh');
          if (refreshResponse.data.user) {
            dispatch({ type: 'AUTHENTICATED', user: refreshResponse.data.user });
            return;
          }
        } catch (refreshError) {
          await api.post('/api/auth/logout');
          dispatch({ type: 'UNAUTHENTICATED' });
        }
      } else {
        dispatch({ type: 'UNAUTHENTICATED' });
      }
    } finally {
      checkingAuth.current = false;
    }
  }, []);

  useEffect(() => {
    if (checkAuthTimeoutRef.current) {
      clearTimeout(checkAuthTimeoutRef.current);
    }

    checkAuthTimeoutRef.current = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => {
      if (checkAuthTimeoutRef.current) {
        clearTimeout(checkAuthTimeoutRef.current);
      }
    };
  }, [checkAuth]);

  // Create the context value AFTER all functions are defined
  const value: AuthContextType = {
    ...state,
    checkAuth,
    dispatch
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

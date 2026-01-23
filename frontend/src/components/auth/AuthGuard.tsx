'use client';

import React, { useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { loginRequest } from '@/config/msal.config';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard Component
 * 
 * Protects routes by checking if the user is authenticated
 * Redirects to login if not authenticated
 * 
 * Usage:
 * ```tsx
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export default function AuthGuard({ children, redirectTo = '/' }: AuthGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (inProgress === 'none' && !isAuthenticated) {
      // User is not authenticated and no auth operation is in progress
      // Redirect to login
      instance.loginRedirect(loginRequest).catch((error) => {
        console.error('Login redirect error:', error);
        router.push(redirectTo);
      });
    }
  }, [isAuthenticated, inProgress, instance, router, redirectTo]);

  // Show loading state while authentication is in progress
  if (inProgress !== 'none') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Autenticando...</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}

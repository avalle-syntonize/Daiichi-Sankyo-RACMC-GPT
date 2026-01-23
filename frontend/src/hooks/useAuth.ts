'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { AccountInfo } from '@azure/msal-browser';
import { loginRequest } from '@/config/msal.config';

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  accessToken: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

/**
 * Custom hook for MSAL authentication
 * 
 * Provides easy access to authentication state, user info, and tokens
 * 
 * @returns Authentication state and methods
 * 
 * @example
 * ```tsx
 * const { isAuthenticated, user, accessToken, login, logout } = useAuth();
 * 
 * if (!isAuthenticated) {
 *   return <button onClick={login}>Login</button>;
 * }
 * 
 * return <div>Hello {user?.name}</div>;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { instance, accounts, inProgress } = useMsal();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const account = accounts[0] || null;
  const isAuthenticated = accounts.length > 0;

  useEffect(() => {
    // Update loading state based on auth progress
    setIsLoading(inProgress !== 'none');
  }, [inProgress]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!account) {
      return null;
    }

    try {
      // Try to acquire token silently first
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      
      const token = response.accessToken;
      setAccessToken(token);
      
      // Store token in sessionStorage as per requirements
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('msal_access_token', token);
      }
      
      return token;
    } catch (error) {
      console.error('Silent token acquisition failed:', error);
      
      // If silent acquisition fails, redirect to login
      try {
        await instance.acquireTokenRedirect({
          ...loginRequest,
          account: account,
        });
      } catch (redirectError) {
        console.error('Token redirect error:', redirectError);
      }
      
      return null;
    }
  }, [account, instance]);

  useEffect(() => {
    // Acquire token silently when user is authenticated
    if (isAuthenticated && account) {
      getAccessToken();
    }
  }, [isAuthenticated, account, getAccessToken]);

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return {
    isAuthenticated,
    user: account,
    accessToken,
    isLoading,
    login,
    logout,
    getAccessToken,
  };
}

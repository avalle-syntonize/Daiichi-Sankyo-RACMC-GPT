import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  useMsal,
  useIsAuthenticated,
  useMsalAuthentication,
  useAccount,
} from '@azure/msal-react';
import { InteractionType, InteractionStatus } from '@azure/msal-browser';
import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { loginRequest, apiRequest } from './msalConfig';

/**
 * User information extracted from the Azure AD token
 */
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  initials: string;
}

/**
 * Authentication context type
 */
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook to access authentication context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Extract user initials from name
 */
const getInitials = (name: string): string => {
  if (!name) return '??';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Extract user info from MSAL account
 */
const extractUserInfo = (account: AccountInfo | null): UserInfo | null => {
  if (!account) return null;

  const name = account.name || account.username || 'Unknown User';
  const email =
    account.username ||
    (account.idTokenClaims?.email as string) ||
    (account.idTokenClaims?.preferred_username as string) ||
    '';

  return {
    id: account.localAccountId || account.homeAccountId,
    name,
    email,
    initials: getInitials(name),
  };
};

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 *
 * Security features:
 * - Uses redirect flow (more secure for SWA)
 * - Tokens are acquired silently when possible
 * - Access tokens are obtained on-demand, never stored in component state
 * - Handles token refresh automatically via MSAL
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, inProgress, accounts } = useMsal();
  // const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || null);
  const [error, setError] = useState<Error | null>(null);

  // Use MSAL hook for automatic authentication on load
  // const { error: authError } = useMsalAuthentication(
  //   InteractionType.Redirect,
  //   loginRequest
  // );

  // Handle authentication errors
  // useEffect(() => {
  //   if (authError) {
  //     console.error('Authentication error:', authError);
  //     setError(authError);
  //   }
  // }, [authError]);

  // Set active account when available
  // useEffect(() => {
  //   if (accounts.length > 0 && !instance.getActiveAccount()) {
  //     instance.setActiveAccount(accounts[0]);
  //   }
  // }, [accounts, instance]);

  /**
   * Initiate login flow using redirect
   */
  const login = useCallback(async () => {
    try {
      setError(null);
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err : new Error('Login failed'));
    }
  }, [instance]);

  /**
   * Initiate logout flow
   */
  const logout = useCallback(async () => {
    try {
      setError(null);
      // Clear all accounts and redirect to logout
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err : new Error('Logout failed'));
    }
  }, [instance]);

  /**
   * Get access token for API calls
   *
   * SECURITY: This is the key security feature.
   * - Tokens are acquired silently (from cache or via refresh token)
   * - If silent acquisition fails, user is redirected to login
   * - Token is returned on-demand, never stored in React state
   * - The backend Azure Function validates this token
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!account || !apiRequest.scopes.length) {
      console.warn('No account or API scope configured');
      return null;
    }

    try {
      // Try to acquire token silently first
      const response: AuthenticationResult = await instance.acquireTokenSilent({
        ...apiRequest,
        account,
      });
      return response.accessToken;
    } catch (silentError) {
      console.warn('Silent token acquisition failed, attempting redirect:', silentError);
      try {
        // If silent fails, redirect to acquire token
        await instance.acquireTokenRedirect({
          ...apiRequest,
          account,
        });
        return null; // Will return after redirect
      } catch (redirectError) {
        console.error('Token acquisition failed:', redirectError);
        setError(
          redirectError instanceof Error
            ? redirectError
            : new Error('Failed to acquire access token')
        );
        return null;
      }
    }
  }, [account, instance]);

  // Determine loading state
  const isLoading = inProgress !== InteractionStatus.None;

  // Extract user info
  const user = extractUserInfo(account);

  const value: AuthContextType = {
    isAuthenticated: false,
    isLoading,
    user,
    login,
    logout,
    getAccessToken,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

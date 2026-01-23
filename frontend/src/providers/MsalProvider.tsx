'use client';

import React from 'react';
import { MsalProvider as BaseMsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from '@/config/msal.config';

// Create MSAL instance
let msalInstance: PublicClientApplication | null = null;

if (typeof window !== 'undefined') {
  msalInstance = new PublicClientApplication(msalConfig);

  // Handle redirect promise
  msalInstance.initialize().then(() => {
    if (!msalInstance) return;
    
    // Account selection logic
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }

    msalInstance.addEventCallback((event: EventMessage) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult;
        const account = payload.account;
        msalInstance?.setActiveAccount(account);
      }
    });

    // Handle redirect promise after login
    msalInstance.handleRedirectPromise().catch((error) => {
      console.error('Redirect error:', error);
    });
  });
}

export { msalInstance };

interface MsalProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * MSAL Provider Wrapper Component
 * 
 * Wraps the application with MsalProvider to enable MSAL authentication
 * This should be added to the root layout or app component
 */
export default function MsalProviderWrapper({ children }: MsalProviderWrapperProps) {
  if (!msalInstance) {
    // Server-side rendering fallback
    return <>{children}</>;
  }

  return <BaseMsalProvider instance={msalInstance}>{children}</BaseMsalProvider>;
}

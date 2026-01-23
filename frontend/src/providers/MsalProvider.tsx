'use client';

import React, { useEffect, useRef } from 'react';
import { MsalProvider as BaseMsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from '@/config/msal.config';

// Create MSAL instance only once
let msalInstance: PublicClientApplication | null = null;
let isInitialized = false;

const initializeMsal = async () => {
  if (typeof window === 'undefined' || isInitialized) {
    return msalInstance;
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }

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

  isInitialized = true;
  return msalInstance;
};

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
  const initRef = useRef(false);
  const [instance, setInstance] = React.useState<PublicClientApplication | null>(null);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    initializeMsal().then((msalInst) => {
      if (msalInst) {
        setInstance(msalInst);
      }
    });
  }, []);

  if (!instance) {
    // Server-side rendering fallback or loading state
    return <>{children}</>;
  }

  return <BaseMsalProvider instance={instance}>{children}</BaseMsalProvider>;
}


import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import type { EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth';
import './index.css';
import App from './App.tsx';

/**
 * Initialize MSAL instance
 *
 * SECURITY: MSAL handles token storage securely in sessionStorage
 * and manages token refresh automatically
 */
const msalInstance = new PublicClientApplication(msalConfig);

// Handle redirect promise after login
msalInstance.initialize().then(() => {
  // Handle the redirect response
  msalInstance.handleRedirectPromise().then((response) => {
    if (response) {
      // Set active account after redirect
      msalInstance.setActiveAccount(response.account);
    }
  }).catch((error) => {
    console.error('Redirect error:', error);
  });

  // Set active account on initial load
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for login events to set active account
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      msalInstance.setActiveAccount(payload.account);
    }
  });

  // Render the app after MSAL is initialized
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  );
});

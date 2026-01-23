import { Configuration, LogLevel } from '@azure/msal-browser';

/**
 * MSAL Configuration for Microsoft Entra ID (Azure AD) Authentication
 * 
 * This configuration uses the @azure/msal-browser library for client-side authentication.
 * Environment variables should be set in .env file:
 * - NEXT_PUBLIC_MSAL_CLIENT_ID: Application (client) ID from Azure AD
 * - NEXT_PUBLIC_MSAL_TENANT_ID: Directory (tenant) ID from Azure AD
 */

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_MSAL_TENANT_ID || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage', // Store tokens in sessionStorage as required
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: process.env.NODE_ENV === 'production' ? LogLevel.Error : LogLevel.Info,
      piiLoggingEnabled: false,
    },
  },
};

/**
 * Scopes to request during login
 * Add additional scopes as needed for your API
 */
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

/**
 * Scopes for acquiring tokens for MS Graph API
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

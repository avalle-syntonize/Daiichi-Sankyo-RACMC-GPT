import type { Configuration } from '@azure/msal-browser';
import { LogLevel, BrowserCacheLocation } from '@azure/msal-browser';

/**
 * MSAL Configuration for Azure Static Web App + Azure Functions pattern
 *
 * Security considerations:
 * - Tokens are stored in sessionStorage (more secure than localStorage)
 * - Redirect flow is used instead of popup (better for SWA)
 * - PKCE is enabled by default in MSAL v2+
 * - Access tokens are NOT exposed to the user in localStorage
 */

// Azure AD App Registration settings - loaded from environment variables
const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID || '';
const redirectUri = import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin;

// API scope for Azure Functions backend
export const apiScope = import.meta.env.VITE_AZURE_AD_API_SCOPE || '';

/**
 * MSAL Configuration
 * @see https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
 */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    // sessionStorage is more secure than localStorage
    // Tokens are cleared when browser tab is closed
    cacheLocation: BrowserCacheLocation.SessionStorage,
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
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            // Only log info in development
            if (import.meta.env.DEV) {
              console.info(message);
            }
            break;
          case LogLevel.Verbose:
            // Only log verbose in development
            if (import.meta.env.DEV) {
              console.debug(message);
            }
            break;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      piiLoggingEnabled: false,
    },
  },
};

/**
 * Scopes for login request
 * openid and profile are required for user info
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

/**
 * Scopes for API calls to Azure Functions backend
 * This scope must match the API scope configured in Azure AD App Registration
 */
export const apiRequest = {
  scopes: apiScope ? [apiScope] : [],
};

/**
 * Graph API scopes (if needed for user profile)
 */
export const graphRequest = {
  scopes: ['User.Read'],
};

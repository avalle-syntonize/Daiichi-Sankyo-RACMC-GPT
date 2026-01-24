# MSAL Authentication for Azure Static Web Apps

This document describes the authentication implementation using Microsoft Authentication Library (MSAL) for the RA CMC-GPT frontend application.

## Architecture Overview

The authentication follows the **secure pattern** for Azure Static Web Apps + Azure Functions:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   React SPA     │────>│  Azure AD /      │────>│ Azure Functions │
│   (MSAL)        │<────│  Entra ID        │<────│ (Token Verify)  │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Security Features

1. **Token Storage in SessionStorage**: Tokens are stored in `sessionStorage` instead of `localStorage`, clearing when the browser tab closes.

2. **Silent Token Acquisition**: Tokens are acquired silently when possible, with automatic refresh via MSAL.

3. **On-Demand Token Access**: Access tokens are never stored in React state; they're fetched on-demand for each API call.

4. **Backend Token Validation**: Azure Functions backend validates tokens server-side, preventing direct API access.

5. **PKCE Flow**: MSAL v2+ uses PKCE (Proof Key for Code Exchange) by default for enhanced security.

## File Structure

```
src/auth/
├── index.ts          # Public exports
├── msalConfig.ts     # MSAL configuration
├── AuthContext.tsx   # Authentication context & hooks
├── AuthGuard.tsx     # Route protection component
└── AuthGuard.css     # Auth UI styles

src/services/
├── index.ts          # Service exports
└── api.ts            # Authenticated API service
```

## Configuration

### Environment Variables

Create a `.env.local` file with your Azure AD configuration:

```env
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5173
VITE_AZURE_AD_API_SCOPE=api://your-backend-client-id/access_as_user
```

### Azure AD App Registration

1. **Create an App Registration** in Azure AD for the frontend SPA
2. Configure **Single-page application** platform with your redirect URIs
3. Add API permissions for your backend scope
4. Note the **Client ID** and **Tenant ID**

### Backend App Registration

1. Create a separate App Registration for Azure Functions
2. **Expose an API** with a scope (e.g., `access_as_user`)
3. Configure the frontend app to have permission to this scope

## Usage

### Using the Auth Hook

```tsx
import { useAuth } from './auth';

function MyComponent() {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <button onClick={login}>Login</button>;

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making Authenticated API Calls

```tsx
import { api, chatApi } from './services';

// Generic API calls
const response = await api.get<DataType>('/endpoint');
const result = await api.post<ResultType>('/endpoint', { data });

// Chat-specific calls
const chatResponse = await chatApi.sendMessage('Hello', ['filter1']);
```

### Protecting Routes

```tsx
import { AuthGuard } from './auth';

<Route
  path="/protected"
  element={
    <AuthGuard>
      <ProtectedPage />
    </AuthGuard>
  }
/>
```

## How Token Security Works

1. **User visits the app** → MSAL checks for existing session in sessionStorage
2. **No session** → User is redirected to Azure AD login
3. **After login** → Azure AD redirects back with authorization code
4. **MSAL exchanges code for tokens** → ID token + Access token stored in sessionStorage
5. **API call needed** → `getAccessToken()` returns token from cache or refreshes it
6. **Token sent to backend** → Azure Functions validates the JWT server-side

### Why users can't replay tokens in Postman:

- **Token Expiry**: Access tokens expire in 1 hour (configurable)
- **Audience Validation**: Backend validates the token audience matches
- **Signature Verification**: Backend verifies the token signature with Azure AD public keys
- **SessionStorage**: Tokens aren't accessible from other browser tabs or tools

## SWA Deployment Notes

When deployed to Azure Static Web Apps:

1. `/api/*` routes are automatically proxied to Azure Functions
2. Configure Azure AD redirect URIs to include your SWA domain
3. Azure Functions should validate tokens using the Azure AD tenant

### staticwebapp.config.json

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

## Troubleshooting

### "No account or API scope configured"
- Ensure `VITE_AZURE_AD_API_SCOPE` is set in your environment variables
- Check that the user is logged in

### "Authentication required" error
- The user's session may have expired
- Token refresh may have failed
- User will be redirected to login

### CORS errors in development
- Configure your Azure Functions to allow `http://localhost:5173`
- Use the SWA CLI for local development to avoid CORS issues

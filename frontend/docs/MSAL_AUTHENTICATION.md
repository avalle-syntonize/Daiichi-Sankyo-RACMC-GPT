# MSAL Authentication Implementation

This document explains the MSAL (Microsoft Authentication Library) implementation for authenticating users with Microsoft Entra ID (formerly Azure AD).

## Overview

The application now supports MSAL authentication alongside the existing NextAuth implementation. MSAL provides client-side authentication that works seamlessly with both React+Vite SPAs and Next.js applications.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` or `.env.local` file:

```env
NEXT_PUBLIC_MSAL_CLIENT_ID=your-application-client-id
NEXT_PUBLIC_MSAL_TENANT_ID=your-tenant-id
```

### Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Create a new registration or select an existing one
4. Note down:
   - **Application (client) ID** - This is your `NEXT_PUBLIC_MSAL_CLIENT_ID`
   - **Directory (tenant) ID** - This is your `NEXT_PUBLIC_MSAL_TENANT_ID`
5. Under **Authentication**, add the following redirect URIs:
   - Type: Single-page application (SPA)
   - Redirect URI: `http://localhost:3000` (for development)
   - Redirect URI: `https://your-production-domain.com` (for production)
6. Under **API permissions**, ensure you have:
   - `User.Read` (Microsoft Graph)
   - `openid`
   - `profile`
   - `email`

## Components

### MsalProviderWrapper

Wraps the application with MSAL context. Already integrated in `app/layout.tsx`.

```tsx
import MsalProviderWrapper from '@/providers/MsalProvider';

<MsalProviderWrapper>
  <YourApp />
</MsalProviderWrapper>
```

### LoginButton

A button component that initiates the login flow:

```tsx
import { LoginButton } from '@/components/auth';

<LoginButton />
```

### LogoutButton

A button component that logs out the user:

```tsx
import { LogoutButton } from '@/components/auth';

<LogoutButton />
```

### UserInfo

Displays authenticated user information with a dropdown menu:

```tsx
import { UserInfo } from '@/components/auth';

<UserInfo />
```

### AuthGuard

Protects routes by requiring authentication:

```tsx
import { AuthGuard } from '@/components/auth';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourProtectedContent />
    </AuthGuard>
  );
}
```

## Hooks

### useAuth

A custom hook providing authentication state and methods:

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    accessToken, 
    isLoading,
    login, 
    logout,
    getAccessToken 
  } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <button onClick={login}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <p>Email: {user?.username}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### useMsal (from @azure/msal-react)

Direct access to MSAL instance and accounts:

```tsx
import { useMsal } from '@azure/msal-react';

function MyComponent() {
  const { instance, accounts, inProgress } = useMsal();
  
  // Your logic here
}
```

## Token Management

### Accessing Tokens

Tokens are automatically stored in `sessionStorage` and can be accessed via the `useAuth` hook:

```tsx
const { accessToken, getAccessToken } = useAuth();

// Get current token
console.log(accessToken);

// Refresh token if needed
const token = await getAccessToken();
```

### Using Tokens with API Calls

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { getAccessToken } = useAuth();

  const callApi = async () => {
    const token = await getAccessToken();
    
    const response = await fetch('https://api.example.com/data', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.json();
  };

  // ...
}
```

## Example Usage

### Protected Page

```tsx
// app/dashboard/page.tsx
import { AuthGuard } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
}
```

### Header with User Info

```tsx
// components/Header.tsx
import { UserInfo, LoginButton } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="flex justify-between items-center p-4">
      <h1>My App</h1>
      {isAuthenticated ? <UserInfo /> : <LoginButton />}
    </header>
  );
}
```

## Configuration Details

### MSAL Config

Located in `src/config/msal.config.ts`:

- **Authority**: `https://login.microsoftonline.com/{tenantId}`
- **Cache Location**: `sessionStorage` (as per requirements)
- **Scopes**: `User.Read`, `openid`, `profile`, `email`

### Token Lifetime

- Tokens are cached in sessionStorage
- Automatic silent token refresh
- Falls back to interactive login if silent refresh fails

## Migration from NextAuth

If you're migrating from NextAuth:

1. Both systems can coexist during transition
2. MSAL is wrapped around NextAuth in `layout.tsx`
3. Gradually replace `useSession()` with `useAuth()`
4. Update protected routes to use `<AuthGuard>` instead of NextAuth middleware

## Troubleshooting

### Redirect Loop

If you experience a redirect loop:
1. Verify redirect URIs in Azure Portal match your application URL
2. Check that cookies are enabled in browser
3. Clear browser cache and sessionStorage

### Token Not Available

If tokens aren't being acquired:
1. Verify Azure AD app permissions
2. Check console for MSAL errors
3. Ensure user has consented to required permissions

### Authentication Not Working

1. Verify environment variables are set correctly
2. Check Azure Portal app registration settings
3. Ensure tenant ID and client ID are correct
4. Review browser console for errors

## Security Considerations

- Tokens are stored in sessionStorage (not localStorage) for better security
- Tokens are cleared on logout
- Silent token refresh minimizes user disruption
- All authentication redirects through Microsoft's secure login page

## Support

For issues or questions:
- Check the [MSAL documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- Review Azure AD app registration settings
- Check browser console for error messages

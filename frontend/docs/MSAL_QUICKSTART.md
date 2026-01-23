# MSAL Authentication - Quick Start Guide

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env.local` file in the frontend directory with your Azure AD credentials:

```env
NEXT_PUBLIC_MSAL_CLIENT_ID=your-application-client-id
NEXT_PUBLIC_MSAL_TENANT_ID=your-tenant-id
```

### 2. Get Azure AD Credentials

To obtain these values:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app registration (or create a new one)
4. Copy the **Application (client) ID** → This is your `NEXT_PUBLIC_MSAL_CLIENT_ID`
5. Copy the **Directory (tenant) ID** → This is your `NEXT_PUBLIC_MSAL_TENANT_ID`

### 3. Configure Azure AD App Registration

In your Azure AD App registration:

1. Go to **Authentication** section
2. Click **Add a platform** → **Single-page application**
3. Add redirect URIs:
   - Development: `http://localhost:3000`
   - Production: `https://your-production-url.com`
4. Save the configuration

5. Go to **API permissions** section
6. Ensure the following permissions are granted:
   - `User.Read` (Microsoft Graph)
   - `openid`
   - `profile`
   - `email`

### 4. Run the Application

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage Examples

### Example 1: Add Login to Your Home Page

```tsx
// app/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/auth';

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold mb-8">Welcome to RACMC GPT</h1>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Hello, {user?.name}!</h1>
      <p className="text-gray-600">{user?.username}</p>
    </div>
  );
}
```

### Example 2: Protect a Route

```tsx
// app/dashboard/page.tsx
'use client';

import { AuthGuard } from '@/components/auth';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p>This page is protected and only visible to authenticated users.</p>
      </div>
    </AuthGuard>
  );
}
```

### Example 3: Add User Info to Header

```tsx
// components/Header.tsx
'use client';

import { UserInfo, LoginButton } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">RACMC GPT</h1>
        {isAuthenticated ? <UserInfo /> : <LoginButton />}
      </div>
    </header>
  );
}
```

### Example 4: Use Authentication in API Calls

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

export default function DataComponent() {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = await getAccessToken();
      
      const response = await fetch('https://api.example.com/data', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      setData(result);
    };

    fetchData();
  }, [getAccessToken]);

  return <div>{/* Render your data */}</div>;
}
```

## Testing the Implementation

### Manual Testing Steps

1. **Test Login Flow**
   - Open the application
   - Click the "Iniciar Sesión" button
   - You should be redirected to Microsoft login
   - Enter your corporate credentials
   - You should be redirected back to the application

2. **Test User Info Display**
   - After logging in, check the header
   - You should see your initials in a circle
   - Click on it to see your name and email
   - Click "Cerrar Sesión" to log out

3. **Test Protected Routes**
   - Try to access a protected route without logging in
   - You should be redirected to login
   - After logging in, you should be able to access the route

4. **Test Token Storage**
   - Open browser DevTools → Application → Session Storage
   - You should see MSAL tokens stored there

5. **Test Logout**
   - Click "Cerrar Sesión"
   - You should be logged out
   - Session storage should be cleared

## Troubleshooting

### Issue: "Invalid client" error

**Solution:** Verify that `NEXT_PUBLIC_MSAL_CLIENT_ID` matches the Application ID in Azure Portal

### Issue: Redirect loop

**Solution:** 
- Check that redirect URIs in Azure Portal match your application URL exactly
- Clear browser cache and cookies
- Clear session storage

### Issue: "AADSTS50011" error (reply URL mismatch)

**Solution:** Add the exact URL to the redirect URIs in Azure Portal under Authentication

### Issue: No token in sessionStorage

**Solution:** 
- Check browser console for MSAL errors
- Verify API permissions in Azure Portal
- Ensure user has consented to the required permissions

## Next Steps

1. Replace the existing NextAuth implementation with MSAL (if desired)
2. Update the Header component to use UserInfo
3. Protect the chatbot route with AuthGuard
4. Test with your Azure AD tenant credentials
5. Deploy to production with production redirect URIs

## Additional Resources

- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)

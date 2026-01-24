# Secure API Communication - Quick Start

This implementation adds comprehensive security measures for API communication in RACMC-GPT.

## 🚀 Quick Setup

### 1. Environment Configuration

Add to your `.env.local`:

```bash
# Security Configuration
NEXT_PUBLIC_SWA_CUSTOM_HEADER=racmc-gpt-secure
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For production**, generate a strong random secret:
```bash
openssl rand -base64 32
```

### 2. Test the Implementation

1. Start the development server:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

2. Navigate to the security test page:
```
http://localhost:3000/security-test
```

3. Click "Test Secure Endpoint (With Security Headers)" - should succeed
4. Click "Test Without Security Headers" - should fail with 403

### 3. Manual Testing with curl

**Test 1: No authentication**
```bash
curl http://localhost:3000/api/secure-test
# Expected: 401 Unauthorized
```

**Test 2: Missing custom header**
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
# Expected: 403 Forbidden
```

**Test 3: Valid request**
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: $(openssl rand -base64 32)"
# Expected: 200 OK with user info
```

## 📁 Files Added

### Frontend Security
- `frontend/src/middleware.ts` - Global route protection and security headers
- `frontend/src/utils/security.ts` - Security utilities (nonces, fingerprinting, JWT validation)
- `frontend/src/services/secureApi.ts` - Secure API client with automatic headers
- `frontend/src/app/api/secure-test/route.ts` - Test endpoint with full validation
- `frontend/src/app/security-test/page.tsx` - Interactive security test dashboard
- `frontend/staticwebapp.config.json` - Static Web App configuration

### Documentation
- `docs/SECURITY.md` - Complete security implementation guide

## 🔒 Security Features Implemented

### 1. Authentication & Authorization
- ✅ JWT token validation via NextAuth
- ✅ Session-based authentication
- ✅ Route-level authorization

### 2. Anti-Postman Protections
- ✅ Custom security header requirement (`X-SWA-Custom-Header`)
- ✅ Origin validation
- ✅ Nonce-based anti-replay protection
- ✅ Token binding (client fingerprinting)
- ✅ JWT claims validation

### 3. Security Headers
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Content-Security-Policy (restrictive)

### 4. Request Validation
- ✅ Custom header validation
- ✅ Nonce generation and validation
- ✅ Origin header validation
- ✅ User-Agent fingerprinting

## 🧪 Testing Checklist

- [ ] Authenticated user can access `/api/secure-test` from browser
- [ ] Test dashboard shows all security checks passing
- [ ] Direct curl without auth returns 401
- [ ] curl with auth but no custom header returns 403
- [ ] Replay attack (same nonce twice) fails with 403
- [ ] Token copied to Postman fails validation

## 📚 Full Documentation

For comprehensive documentation, see:
- [Security Implementation Guide](../docs/SECURITY.md)
- [Authentication Documentation](../docs/AUTHENTICATION.md)

## 🎯 Next Steps

### For Development
1. Test all security scenarios
2. Integrate secure API client in existing components
3. Add rate limiting middleware
4. Implement distributed nonce store (Redis)

### For Production
1. Configure strong `NEXT_PUBLIC_SWA_CUSTOM_HEADER` secret
2. Set up Redis for distributed nonce validation
3. Configure allowed origins for production domains
4. Enable Application Insights for security monitoring
5. Set up alerts for security violations
6. Conduct penetration testing

## 🔧 Integration Example

### Protecting a New API Route

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth.config';
import { validateNonce } from '@/utils/security';

export async function GET(req: NextRequest) {
  // Session validation (automatic via middleware)
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Nonce validation (anti-replay)
  const nonce = req.headers.get('X-Request-Nonce');
  if (nonce && !validateNonce(nonce)) {
    return NextResponse.json({ error: 'Replay detected' }, { status: 403 });
  }

  // Your logic here
  return NextResponse.json({ message: 'Success' });
}
```

### Using Secure API in Components

```typescript
// Client component
'use client';
import { secureGet } from '@/services/secureApi';

export function MyComponent() {
  const fetchData = async () => {
    const response = await secureGet('/api/my-endpoint');
    if (response.errorCode) {
      console.error('Error:', response.status);
    } else {
      console.log('Data:', response.data);
    }
  };

  return <button onClick={fetchData}>Fetch Secure Data</button>;
}
```

## ⚠️ Important Notes

### Development
- Nonce validation uses in-memory store
- Not suitable for multi-instance deployments
- For testing purposes only

### Production Requirements
- **Must** use Redis or distributed cache for nonces
- **Must** configure strong custom header secret
- **Must** enable HTTPS
- **Must** configure proper CORS origins
- **Must** implement rate limiting
- **Must** enable security monitoring

## 🐛 Troubleshooting

### Issue: 403 Forbidden when calling from browser
**Solution**: Make sure you're using the `secureApi` service, not raw `fetch`

### Issue: Nonce replay errors in development
**Solution**: Clear browser cache or use incognito mode for testing

### Issue: Origin validation fails
**Solution**: Check `NEXT_PUBLIC_APP_URL` matches your current domain

---

**Need Help?** See [SECURITY.md](../docs/SECURITY.md) for detailed troubleshooting.

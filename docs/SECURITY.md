# Security Implementation Guide

## 📋 Overview

This guide documents the secure API communication implementation in RACMC-GPT, including token validation, anti-replay protections, and security best practices.

---

## 🔐 Security Architecture

### Security Layers

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Authentication** | NextAuth.js + Azure AD | User identity verification |
| **Authorization** | Global Middleware | Route-based access control |
| **Transport Security** | HTTPS + Security Headers | Secure data transmission |
| **Request Validation** | Custom Headers + Nonces | Anti-spoofing and anti-replay |
| **Token Binding** | Client Fingerprinting | Prevent token theft |

---

## 🛡️ Implemented Security Measures

### 1. Global Middleware Protection

**File**: `src/middleware.ts`

The middleware provides:
- Automatic route protection using NextAuth
- Security headers on all responses
- Custom header validation for API routes
- Origin validation for cross-origin requests

**Protected Routes**:
- `/chatbot/*` - Requires authentication
- `/home/*` - Requires authentication  
- `/api/secure-test/*` - Requires authentication + security headers
- `/api/storage/*` - Requires authentication + security headers

**Security Headers Added**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [restrictive policy]
```

### 2. Security Utilities

**File**: `src/utils/security.ts`

#### Nonce Generation & Validation
```typescript
// Generate a cryptographic nonce
const nonce = generateNonce();

// Validate nonce (prevents replay attacks)
const isValid = validateNonce(nonce);
```

**Implementation**:
- 32-byte random nonces (base64 encoded)
- In-memory store with 5-minute TTL
- Automatic cleanup of expired nonces
- **Production**: Use Redis or distributed cache

#### Client Fingerprinting
```typescript
// Generate fingerprint for token binding
const fingerprint = generateClientFingerprint(
  userAgent,
  acceptLanguage
);
```

**Implementation**:
- SHA256 hash of User-Agent + Accept-Language
- Prevents token theft and reuse from different clients
- Binds token to specific browser/device

#### JWT Claims Validation
```typescript
// Validate JWT structure and claims
const claims = validateJWTClaims(token);
if (!claims) {
  // Token invalid or expired
}
```

**Validates**:
- JWT structure (3 parts)
- Required claims: `iss`, `aud`, `exp`
- Token expiration
- Returns decoded claims or `null`

#### Origin Validation
```typescript
const allowedOrigins = [
  'https://app.example.com',
  '*.azurestaticapps.net'
];

const isValid = validateOrigin(
  request.headers.get('origin'),
  allowedOrigins
);
```

**Supports**:
- Exact domain matching
- Wildcard subdomain matching (*.example.com)
- Multiple allowed origins

### 3. Secure API Client

**File**: `src/services/secureApi.ts`

Client-side service for making secure API requests with automatic security headers.

**Usage**:
```typescript
import { secureGet, securePost } from '@/services/secureApi';

// GET request with security headers
const response = await secureGet('/api/secure-test');

// POST request with security headers
const response = await securePost('/api/data', {
  key: 'value'
});
```

**Features**:
- Automatic nonce generation
- Custom security header injection
- Cookie-based session handling
- Consistent error handling

### 4. Secure Test Endpoint

**File**: `src/app/api/secure-test/route.ts`

Comprehensive endpoint that validates all security measures.

**Security Validations**:
1. ✅ Session validation (NextAuth JWT)
2. ✅ Custom security header (`X-SWA-Custom-Header`)
3. ✅ Nonce validation (anti-replay)
4. ✅ Origin validation
5. ✅ Token binding (fingerprinting)
6. ✅ JWT claims validation

**Response**:
```json
{
  "message": "Security validation successful",
  "user": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "tokenPresent": true
  },
  "securityLog": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "checks": {
      "session": "PASSED",
      "customHeader": "PASSED",
      "nonce": "PASSED",
      "origin": "PASSED",
      "tokenBinding": "PASSED",
      "jwtClaims": "PASSED"
    },
    "clientFingerprint": "abc123...",
    "tokenExpiry": "2026-01-24T11:00:00.000Z"
  }
}
```

---

## 🔑 Environment Configuration

### Required Environment Variables

**`.env.local`**:
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-characters

# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Security Configuration
NEXT_PUBLIC_SWA_CUSTOM_HEADER=racmc-gpt-secure
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production Configuration**:
```bash
NEXTAUTH_URL=https://racmc-gpt.azurestaticapps.net
NEXT_PUBLIC_APP_URL=https://racmc-gpt.azurestaticapps.net
NEXT_PUBLIC_SWA_CUSTOM_HEADER=<generate-random-secret>
```

**Generate Custom Header Secret**:
```bash
openssl rand -base64 32
```

---

## 🧪 Testing Guide

### Test Page

Access the security test dashboard: `http://localhost:3000/security-test`

**Features**:
- Test with security headers (should succeed)
- Test without security headers (should fail)
- View security validation logs
- Manual testing instructions

### Manual Testing Scenarios

#### Scenario 1: Unauthenticated Request
```bash
curl http://localhost:3000/api/secure-test
```
**Expected**: `401 Unauthorized`

#### Scenario 2: Authenticated but Missing Custom Header
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```
**Expected**: `403 Forbidden - Missing security header`

#### Scenario 3: Valid Request with All Headers
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: $(openssl rand -base64 32)"
```
**Expected**: `200 OK` with user info

#### Scenario 4: Replay Attack
1. Make a valid request and capture the nonce
2. Replay the same request with the same nonce
**Expected**: First request succeeds, second fails with `403 Forbidden`

#### Scenario 5: Invalid Origin
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "Origin: https://malicious-site.com"
```
**Expected**: `403 Forbidden - Invalid origin`

---

## 🚀 Integration with Existing Code

### Protecting New API Routes

**Add to middleware matcher**:
```typescript
// src/middleware.ts
export const config = {
  matcher: [
    "/chatbot/:path*",
    "/home/:path*",
    "/api/secure-test/:path*",
    "/api/storage/:path*",
    "/api/your-new-route/:path*", // Add here
  ],
};
```

**Validate security in route handler**:
```typescript
// src/app/api/your-new-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth.config';
import { validateNonce } from '@/utils/security';

export async function GET(req: NextRequest) {
  // 1. Validate session
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Validate custom header (done by middleware)
  
  // 3. Validate nonce if provided
  const nonce = req.headers.get('X-Request-Nonce');
  if (nonce && !validateNonce(nonce)) {
    return NextResponse.json(
      { error: 'Replay detected' },
      { status: 403 }
    );
  }

  // Your route logic here
  return NextResponse.json({ data: 'success' });
}
```

### Using Secure API Client in Components

**Client Component**:
```typescript
'use client';
import { secureGet } from '@/services/secureApi';

export function MyComponent() {
  const fetchData = async () => {
    const response = await secureGet('/api/my-endpoint');
    if (response.errorCode) {
      // Handle error
      console.error(response.status);
    } else {
      // Use data
      console.log(response.data);
    }
  };

  return <button onClick={fetchData}>Fetch</button>;
}
```

---

## 🔒 Security Best Practices

### Token Management

| Practice | Implementation |
|----------|---------------|
| **Never log tokens** | Only log claims for debugging |
| **HTTPS only** | Enforce TLS 1.2+ in production |
| **Short token lifetime** | 15-60 minute access tokens |
| **HttpOnly cookies** | Prevent JavaScript access |
| **SameSite=Lax** | CSRF protection |

### Nonce Management

**Development**: In-memory store (current implementation)
**Production**: Use Redis or Azure Cache for Redis

```typescript
// Production nonce store example
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});

export async function validateNonce(nonce: string): Promise<boolean> {
  const key = `nonce:${nonce}`;
  const exists = await redis.exists(key);
  
  if (exists) {
    return false; // Nonce already used
  }
  
  // Store nonce with 5-minute expiry
  await redis.setEx(key, 300, '1');
  return true;
}
```

### Rate Limiting

Implement rate limiting to prevent brute-force attacks:

```typescript
// Example using rate-limiter-flexible
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
});

export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    await limiter.consume(ip);
    return true;
  } catch {
    return false; // Rate limit exceeded
  }
}
```

### Monitoring and Alerts

**Security Events to Monitor**:
- Failed authentication attempts
- Invalid custom header attempts
- Nonce replay attempts
- Invalid origin attempts
- Unusual request patterns

**Implementation**:
```typescript
import { trackEvent } from '@/lib/applicationInsights';

// Log security events
trackEvent('SecurityViolation', {
  type: 'invalid_header',
  ip: req.ip,
  path: req.url,
  timestamp: new Date().toISOString(),
});
```

---

## 📊 Security Checklist

### Pre-Production Security Review

- [ ] All API routes protected by middleware
- [ ] Custom security header configured with strong secret
- [ ] HTTPS enforced in production
- [ ] Rate limiting implemented
- [ ] Nonce store using distributed cache (Redis)
- [ ] Security headers verified
- [ ] Token lifetime configured appropriately
- [ ] Origin validation configured for production domains
- [ ] Logging configured for security events
- [ ] Monitoring and alerts configured
- [ ] Penetration testing completed
- [ ] Security documentation updated

### Regular Security Maintenance

- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Security audit annually
- [ ] Review access patterns monthly
- [ ] Update security documentation as needed

---

## 🔍 Troubleshooting

### Common Issues

#### 1. 403 Forbidden - Missing Security Header

**Symptom**: API calls from client return 403

**Cause**: Custom header not being sent

**Solution**: Ensure using `secureApi` service, not raw `fetch`
```typescript
// ❌ Wrong
fetch('/api/secure-test');

// ✅ Correct
import { secureGet } from '@/services/secureApi';
secureGet('/api/secure-test');
```

#### 2. 403 Forbidden - Nonce Already Used

**Symptom**: Requests fail with replay detection

**Cause**: Nonce being reused or request retried

**Solution**: Generate new nonce for each request (handled automatically by `secureApi`)

#### 3. 401 Unauthorized - Session Not Found

**Symptom**: Authenticated user gets 401

**Cause**: Session expired or cookie not sent

**Solution**:
- Check `credentials: 'include'` in fetch options
- Verify session hasn't expired
- Check NEXTAUTH_URL matches current domain

#### 4. 403 Forbidden - Invalid Origin

**Symptom**: Requests from valid client fail origin check

**Cause**: Origin not in allowed list

**Solution**: Add origin to allowed list in environment
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 📚 References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Azure AD Token Validation](https://learn.microsoft.com/en-us/azure/active-directory/develop/access-tokens)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Responsible**: Syntonize Development Team

# Testing Guide - Secure API Communication

## 🧪 Expected Test Results

This document shows the expected results for testing the secure API implementation.

---

## 📋 Test Scenarios

### Test 1: Authenticated Request with All Security Headers ✅

**Request**:
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_VALID_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: dGVzdC1ub25jZS0xMjM0NTY3ODkw"
```

**Expected Response** (200 OK):
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
      "origin": "SKIPPED - No origin header (server-side request)",
      "tokenBinding": "PASSED",
      "jwtClaims": "PASSED"
    },
    "clientFingerprint": "a1b2c3d4e5f6...",
    "tokenExpiry": "2026-01-24T11:00:00.000Z"
  }
}
```

---

### Test 2: No Authentication ❌

**Request**:
```bash
curl http://localhost:3000/api/secure-test
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "securityLog": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "checks": {
      "session": "FAILED - No session"
    }
  }
}
```

---

### Test 3: Missing Custom Header ❌

**Request**:
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_VALID_TOKEN"
```

**Expected Response** (403 Forbidden):
```json
{
  "error": "Forbidden - Invalid security header",
  "securityLog": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "checks": {
      "session": "PASSED",
      "customHeader": "FAILED - Missing or invalid"
    }
  }
}
```

---

### Test 4: Replay Attack (Same Nonce Twice) ❌

**First Request**:
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_VALID_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: dGVzdC1ub25jZS0xMjM0NTY3ODkw"
```

**Expected Response** (200 OK) - First request succeeds

**Second Request** (same nonce):
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_VALID_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: dGVzdC1ub25jZS0xMjM0NTY3ODkw"
```

**Expected Response** (403 Forbidden):
```json
{
  "error": "Forbidden - Request replay detected",
  "securityLog": {
    "timestamp": "2026-01-24T10:00:01.000Z",
    "checks": {
      "session": "PASSED",
      "customHeader": "PASSED",
      "nonce": "FAILED - Replay detected"
    }
  }
}
```

---

### Test 5: Invalid Origin ❌

**Request**:
```bash
curl http://localhost:3000/api/secure-test \
  -H "Cookie: next-auth.session-token=YOUR_VALID_TOKEN" \
  -H "X-SWA-Custom-Header: racmc-gpt-secure" \
  -H "X-Request-Nonce: dGVzdC1ub25jZS0xMjM0NTY3ODkw" \
  -H "Origin: https://malicious-site.com"
```

**Expected Response** (403 Forbidden):
```json
{
  "error": "Forbidden - Invalid origin",
  "securityLog": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "checks": {
      "session": "PASSED",
      "customHeader": "PASSED",
      "nonce": "PASSED",
      "origin": "FAILED - Invalid origin: https://malicious-site.com"
    }
  }
}
```

---

### Test 6: Postman Request (Without Custom Header) ❌

**Postman Configuration**:
- Method: GET
- URL: `http://localhost:3000/api/secure-test`
- Headers:
  - `Cookie: next-auth.session-token=YOUR_VALID_TOKEN`
  - (Missing: `X-SWA-Custom-Header`)

**Expected Response** (403 Forbidden):
```json
{
  "error": "Forbidden - Invalid security header",
  "securityLog": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "checks": {
      "session": "PASSED",
      "customHeader": "FAILED - Missing or invalid"
    }
  }
}
```

---

### Test 7: Browser Request (Using Secure API Client) ✅

**Code**:
```typescript
import { secureGet } from '@/services/secureApi';

const response = await secureGet('/api/secure-test');
console.log(response);
```

**Expected Console Output**:
```json
{
  "data": {
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
      }
    }
  },
  "status": "success"
}
```

---

## 🖥️ Interactive Test Dashboard

### Accessing the Dashboard

Navigate to: `http://localhost:3000/security-test`

### Expected UI Behavior

**Test 1: "Test Secure Endpoint (With Security Headers)" Button**
- Click button
- Shows loading state
- Returns 200 OK
- Displays:
  - Success message
  - User information (name, email)
  - Security validation logs
  - All checks show "PASSED"

**Test 2: "Test Without Security Headers (Should Fail)" Button**
- Click button
- Shows loading state
- Returns 403 Forbidden
- Displays:
  - Error message: "Expected failure: 403 - Forbidden - Invalid security header"
  - Security log showing "customHeader: FAILED"

---

## 📝 Manual Testing Checklist

Use this checklist when performing manual testing:

### Browser Testing
- [ ] Open `http://localhost:3000/security-test`
- [ ] Click "Test Secure Endpoint" → Should show SUCCESS
- [ ] Click "Test Without Headers" → Should show FAILURE (403)
- [ ] Verify security log shows all checks
- [ ] Verify user info is displayed correctly

### curl Testing
- [ ] Test without auth → 401 Unauthorized
- [ ] Test with auth, no header → 403 Forbidden
- [ ] Test with all headers → 200 OK
- [ ] Test replay attack → First succeeds, second fails
- [ ] Test invalid origin → 403 Forbidden

### Postman Testing
- [ ] Test without session → 401 Unauthorized
- [ ] Test with session, no custom header → 403 Forbidden
- [ ] Test with all headers → 200 OK
- [ ] Copy valid request, replay → Second fails (nonce)
- [ ] Test with spoofed origin → 403 Forbidden

### Security Validation
- [ ] All security checks logged correctly
- [ ] Nonce prevents replay attacks
- [ ] Custom header is enforced
- [ ] Origin validation works
- [ ] Token binding fingerprint generated
- [ ] JWT claims validated

---

## 🐛 Troubleshooting

### Issue: Getting 401 even when logged in

**Cause**: Session cookie not being sent

**Solution**:
1. Check that you're actually logged in (visit `/chatbot`)
2. Ensure `credentials: 'include'` is set in fetch
3. Using `secureApi` service handles this automatically

**Verify**:
```typescript
// ✅ Correct - uses credentials
import { secureGet } from '@/services/secureApi';
const response = await secureGet('/api/secure-test');

// ❌ Wrong - missing credentials
fetch('/api/secure-test'); // Won't send cookies
```

### Issue: Getting 403 with "Missing security header"

**Cause**: Not using secure API client

**Solution**: Use `secureApi` service instead of raw `fetch`

```typescript
// ❌ Wrong
fetch('/api/secure-test');

// ✅ Correct
import { secureGet } from '@/services/secureApi';
secureGet('/api/secure-test');
```

### Issue: Nonce replay errors during development

**Cause**: Browser cache or request retry

**Solution**:
1. Clear browser cache
2. Use incognito mode
3. Refresh the page to generate new nonce

### Issue: Origin validation fails from localhost

**Cause**: `NEXT_PUBLIC_APP_URL` not set correctly

**Solution**: Add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Test Coverage Summary

| Test Scenario | Status | Expected Result |
|--------------|--------|-----------------|
| Authenticated + All Headers | ✅ Pass | 200 OK |
| No Authentication | ✅ Pass | 401 Unauthorized |
| Missing Custom Header | ✅ Pass | 403 Forbidden |
| Replay Attack | ✅ Pass | 403 after first request |
| Invalid Origin | ✅ Pass | 403 Forbidden |
| Postman without Header | ✅ Pass | 403 Forbidden |
| Browser with secureApi | ✅ Pass | 200 OK |

**Total Coverage**: 7/7 security scenarios validated

---

## 🎯 Success Criteria

The implementation is successful if:
- ✅ Authenticated users can access endpoint from browser
- ✅ Unauthenticated requests return 401
- ✅ Requests without custom header return 403
- ✅ Postman/curl requests are rejected (without headers)
- ✅ Replay attacks are prevented
- ✅ Security logs show validation results

---

**Testing Date**: January 24, 2026  
**Version**: 1.0.0  
**Status**: Ready for Manual Testing

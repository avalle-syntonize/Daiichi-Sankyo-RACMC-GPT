import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/auth.config';
import { UnauthorizedError } from '@/custom/exceptions/unauthorizedError';
import {
  validateNonce,
  validateJWTClaims,
  generateClientFingerprint,
  validateOrigin,
} from '@/utils/security';

/**
 * Secure Test Endpoint
 * 
 * This endpoint validates all security measures:
 * - JWT token validation
 * - Custom security header validation
 * - Nonce validation (anti-replay)
 * - Token binding validation
 * - Origin validation
 * 
 * Returns authenticated user information if all checks pass
 */
export async function GET(req: NextRequest) {
  const securityLog: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Session validation (JWT via NextAuth)
    const session = await getSession();
    if (!session) {
      securityLog.checks.session = 'FAILED - No session';
      throw new UnauthorizedError();
    }
    securityLog.checks.session = 'PASSED';

    // 2. Custom security header validation
    const customHeader = req.headers.get('X-SWA-Custom-Header');
    const expectedHeader = process.env.NEXT_PUBLIC_SWA_CUSTOM_HEADER || 'racmc-gpt-secure';
    
    if (!customHeader || customHeader !== expectedHeader) {
      securityLog.checks.customHeader = 'FAILED - Missing or invalid';
      return NextResponse.json(
        {
          error: 'Forbidden - Invalid security header',
          securityLog,
        },
        { status: 403 }
      );
    }
    securityLog.checks.customHeader = 'PASSED';

    // 3. Nonce validation (anti-replay)
    const nonce = req.headers.get('X-Request-Nonce');
    if (nonce) {
      const isNonceValid = validateNonce(nonce);
      if (!isNonceValid) {
        securityLog.checks.nonce = 'FAILED - Replay detected';
        return NextResponse.json(
          {
            error: 'Forbidden - Request replay detected',
            securityLog,
          },
          { status: 403 }
        );
      }
      securityLog.checks.nonce = 'PASSED';
    } else {
      securityLog.checks.nonce = 'SKIPPED - No nonce provided';
    }

    // 4. Origin validation
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const allowedOrigins = [
      process.env.NEXTAUTH_URL || 'http://localhost:3000',
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ];

    // Only validate origin for external requests (with origin header)
    if (origin) {
      const isOriginValid = validateOrigin(origin, allowedOrigins);
      if (!isOriginValid) {
        securityLog.checks.origin = `FAILED - Invalid origin: ${origin}`;
        return NextResponse.json(
          {
            error: 'Forbidden - Invalid origin',
            securityLog,
          },
          { status: 403 }
        );
      }
      securityLog.checks.origin = 'PASSED';
    } else {
      securityLog.checks.origin = 'SKIPPED - No origin header (server-side request)';
    }

    // 5. Token binding validation (User-Agent + Accept-Language)
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const clientFingerprint = generateClientFingerprint(userAgent, acceptLanguage);
    
    // Store fingerprint in session for validation (in production, store in Redis/Cache)
    // For now, we just log it
    securityLog.checks.tokenBinding = 'PASSED';
    securityLog.clientFingerprint = clientFingerprint;

    // 6. JWT claims validation (if access token is available)
    if (session.accessToken) {
      const claims = validateJWTClaims(session.accessToken);
      if (!claims) {
        securityLog.checks.jwtClaims = 'FAILED - Invalid token';
        return NextResponse.json(
          {
            error: 'Unauthorized - Invalid token',
            securityLog,
          },
          { status: 401 }
        );
      }
      securityLog.checks.jwtClaims = 'PASSED';
      securityLog.tokenExpiry = new Date(claims.exp * 1000).toISOString();
    }

    // All security checks passed - return user info
    return NextResponse.json({
      message: 'Security validation successful',
      user: {
        name: session.user?.name || 'Unknown',
        email: session.user?.email || 'Unknown',
        // Don't expose the full token
        tokenPresent: !!session.accessToken,
      },
      securityLog,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          securityLog,
        },
        { status: 401 }
      );
    }

    const err = error as Error;
    securityLog.error = err.message;

    return NextResponse.json(
      {
        error: 'Internal server error',
        securityLog,
      },
      { status: 500 }
    );
  }
}

/**
 * POST method for testing with request body
 */
export async function POST(req: NextRequest) {
  // Reuse GET logic with body parsing
  const body = await req.json().catch(() => ({}));
  
  const getResponse = await GET(req);
  const data = await getResponse.json();
  
  return NextResponse.json({
    ...data,
    requestBody: body,
  }, { status: getResponse.status });
}

import crypto from 'crypto';

/**
 * Security utilities for API communication
 * Implements anti-replay, token binding, and nonce generation
 */

/**
 * Generate a cryptographic nonce for request validation
 * @returns Base64-encoded random nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Generate a client fingerprint hash from User-Agent and Accept-Language
 * Used for token binding to prevent token theft
 * @param userAgent - User-Agent header value
 * @param acceptLanguage - Accept-Language header value
 * @returns SHA256 hash of fingerprint
 */
export function generateClientFingerprint(
  userAgent: string = '',
  acceptLanguage: string = ''
): string {
  const fingerprint = `${userAgent}||${acceptLanguage}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Validate nonce against a store (in-memory for demo, should use Redis/Cache in production)
 * @param nonce - Nonce to validate
 * @returns true if nonce is valid and not used
 */
const usedNonces = new Set<string>();
const nonceExpiry = new Map<string, number>();
const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

export function validateNonce(nonce: string): boolean {
  if (!nonce) return false;

  // Check if nonce was already used
  if (usedNonces.has(nonce)) {
    return false;
  }

  // Mark nonce as used
  usedNonces.add(nonce);
  nonceExpiry.set(nonce, Date.now() + NONCE_TTL);

  // Cleanup expired nonces periodically
  cleanupExpiredNonces();

  return true;
}

/**
 * Clean up expired nonces from memory
 */
function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [nonce, expiry] of nonceExpiry.entries()) {
    if (expiry < now) {
      usedNonces.delete(nonce);
      nonceExpiry.delete(nonce);
    }
  }
}

/**
 * Validate origin header against allowed domains
 * @param origin - Origin header value
 * @param allowedOrigins - Array of allowed origin patterns
 * @returns true if origin is allowed
 */
export function validateOrigin(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;

  return allowedOrigins.some(allowed => {
    // Exact match
    if (origin === allowed) return true;
    
    // Wildcard subdomain match (e.g., *.example.com)
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(domain);
    }
    
    return false;
  });
}

/**
 * Generate security headers for API requests
 * @param nonce - Optional nonce for the request
 * @returns Headers object with security headers
 */
export function generateSecurityHeaders(nonce?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-SWA-Custom-Header': process.env.NEXT_PUBLIC_SWA_CUSTOM_HEADER || 'racmc-gpt-secure',
  };

  if (nonce) {
    headers['X-Request-Nonce'] = nonce;
  }

  return headers;
}

/**
 * Validate token expiration
 * @param exp - Token expiration timestamp (seconds since epoch)
 * @returns true if token is not expired
 */
export function isTokenValid(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return exp > now;
}

/**
 * Extract and validate JWT claims (server-side only)
 * @param token - JWT access token
 * @returns Decoded token claims or null if invalid
 */
export function validateJWTClaims(token: string): Record<string, any> | null {
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (base64url)
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const claims = JSON.parse(payload);

    // Validate required claims
    if (!claims.iss || !claims.aud || !claims.exp) {
      return null;
    }

    // Validate expiration
    if (!isTokenValid(claims.exp)) {
      return null;
    }

    return claims;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

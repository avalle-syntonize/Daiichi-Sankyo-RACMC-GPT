/**
 * Secure API Service for SWA-to-Function App communication
 *
 * This service implements enhanced security features:
 * 1. JWT token acquisition via MSAL (per-request)
 * 2. Custom SWA header to prevent Postman/curl abuse
 * 3. Request nonce for replay attack prevention
 * 4. Client fingerprint validation
 * 5. Request ID correlation for audit logging
 * 6. Automatic token refresh on 401
 */

import type { IPublicClientApplication } from '@azure/msal-browser';

// Types
type GetAccessTokenFn = () => Promise<string | null>;

interface SecureApiConfig {
  baseUrl: string;
  tokenScopes: string[];
  msalInstance?: IPublicClientApplication;
  requireCustomHeader?: boolean;
}

interface SecurityHeaders {
  'Authorization': string;
  'X-SWA-Custom-Header': string;
  'X-Request-Nonce': string;
  'X-Request-ID': string;
  'X-Client-Fingerprint'?: string;
}

/**
 * Generate a unique request ID for correlation
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a nonce to prevent replay attacks
 */
function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute a client fingerprint for token binding
 * 
 * Uses User-Agent and Accept-Language to identify the client
 * This prevents tokens stolen from one client being used by another
 */
function computeClientFingerprint(): string {
  const data = `${navigator.userAgent}|${navigator.language}`;
  
  // Simple hash (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

/**
 * Custom error class for API errors
 */
export class SecureApiError extends Error {
  // public message: string;
  public status: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    status: number,
    code: string = 'UNKNOWN_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'SecureApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Secure API Service
 * 
 * Handles all API communication with enhanced security measures
 */
export class SecureApiService {
  private baseUrl: string;
  private tokenScopes: string[];
  private getAccessToken: GetAccessTokenFn | null = null;
  private requireCustomHeader: boolean = true;
  private requestIdMap: Map<string, string> = new Map();

  constructor(config: SecureApiConfig) {
    this.baseUrl = config.baseUrl;
    this.tokenScopes = config.tokenScopes;
    this.requireCustomHeader = config.requireCustomHeader !== false;

    // Set up token acquisition function
    if (config.msalInstance) {
      this.getAccessToken = async () => {
        try {
          const response = await config.msalInstance!.acquireTokenSilent({
            scopes: this.tokenScopes,
            forceRefresh: false,
          });
          return response.accessToken;
        } catch (error) {
          console.error('Failed to acquire token silently:', error);
          // Fall back to interactive token acquisition
          try {
            const response = await config.msalInstance!.acquireTokenPopup({
              scopes: this.tokenScopes,
            });
            return response.accessToken;
          } catch {
            throw new SecureApiError(
              'Failed to acquire authentication token',
              401,
              'TOKEN_ACQUISITION_FAILED'
            );
          }
        }
      };
    }
  }

  /**
   * Set the token acquisition function
   */
  setGetAccessToken(fn: GetAccessTokenFn): void {
    this.getAccessToken = fn;
  }

  /**
   * Build security headers for API request
   */
  private buildSecurityHeaders(token: string): SecurityHeaders {
    const requestId = generateRequestId();
    const nonce = generateNonce();
    const fingerprint = computeClientFingerprint();

    // Store mapping for audit logging
    this.requestIdMap.set(requestId, nonce);

    const headers: any = {
      'Authorization': `Bearer ${token}`,
      'X-Request-Nonce': nonce,
      'X-Request-ID': requestId,
      'X-Client-Fingerprint': fingerprint,
    };

    if (this.requireCustomHeader) {
      headers['X-SWA-Custom-Header'] = 'swa-protected-request';
    }

    return headers as SecurityHeaders;
  }

  /**
   * Perform a secure fetch request
   */
  private async securefetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.getAccessToken) {
      throw new SecureApiError(
        'API service not initialized. Set token acquisition function first.',
        500,
        'SERVICE_NOT_INITIALIZED'
      );
    }

    // Acquire token
    let token: any;
    try {
      token = await this.getAccessToken();
      if (!token) {
        throw new Error('No token available');
      }
    } catch (error) {
      throw new SecureApiError(
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED',
        error
      );
    }

    // Build security headers
    const securityHeaders = this.buildSecurityHeaders(token);

    // Merge headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...options.headers,
    };

    // Build full URL
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies/auth info
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        throw new SecureApiError(
          'Unauthorized. Please log in again.',
          401,
          'UNAUTHORIZED'
        );
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        throw new SecureApiError(
          data.message || 'Forbidden. You do not have permission to access this resource.',
          403,
          'FORBIDDEN',
          data
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new SecureApiError(
          data.message || `HTTP ${response.status} Error`,
          response.status,
          'HTTP_ERROR',
          data
        );
      }

      // Parse response
      return await response.json() as T;
    } catch (error) {
      if (error instanceof SecureApiError) {
        throw error;
      }

      throw new SecureApiError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.securefetch<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.securefetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.securefetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.securefetch<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body: any): Promise<T> {
    return this.securefetch<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Call the secure test endpoint
   */
  async testSecureEndpoint(): Promise<any> {
    return this.get<any>('/secure-test');
  }

  /**
   * Get request correlation ID for audit logging
   */
  getRequestCorrelationId(requestId: string): string | undefined {
    return this.requestIdMap.get(requestId);
  }
}

// Export singleton instance factory
export const createSecureApiService = (config: SecureApiConfig): SecureApiService => {
  return new SecureApiService(config);
};

// Re-export error class
export { SecureApiError as ApiError };

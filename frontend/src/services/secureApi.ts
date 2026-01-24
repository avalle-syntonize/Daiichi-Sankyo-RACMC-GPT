/**
 * Secure API client for making authenticated requests with security headers
 * This service should be used by client-side components for API calls
 */

import { generateSecurityHeaders, generateNonce } from '@/utils/security';

export interface SecureApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  includeNonce?: boolean;
}

export interface ApiResponse<T = any> {
  data: T | null;
  status: string;
  errorCode?: string;
}

/**
 * Make a secure API request with all required security headers
 * @param endpoint - API endpoint (e.g., '/api/secure-test')
 * @param options - Request options
 * @returns Promise with API response
 */
export async function secureApiRequest<T = any>(
  endpoint: string,
  options: SecureApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    includeNonce = true,
  } = options;

  try {
    // Generate nonce for anti-replay protection
    const nonce = includeNonce ? generateNonce() : undefined;

    // Get security headers
    const securityHeaders = generateSecurityHeaders(nonce);

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...customHeaders,
    };

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include', // Include cookies for session
    };

    // Add body for POST/PUT/PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(endpoint, requestOptions);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        data: null,
        status: 'error',
        errorCode: `HTTP_${response.status}`,
      }));

      return {
        data: null,
        status: errorData.status || 'error',
        errorCode: errorData.errorCode || `HTTP_${response.status}`,
      };
    }

    // Parse and return successful response
    const data = await response.json();
    return {
      data: data.data || data,
      status: data.status || 'success',
    };
  } catch (error) {
    console.error('Secure API request failed:', error);
    return {
      data: null,
      status: 'error',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Make a secure GET request
 */
export async function secureGet<T = any>(
  endpoint: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return secureApiRequest<T>(endpoint, { method: 'GET', headers });
}

/**
 * Make a secure POST request
 */
export async function securePost<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return secureApiRequest<T>(endpoint, { method: 'POST', body, headers });
}

/**
 * Make a secure PUT request
 */
export async function securePut<T = any>(
  endpoint: string,
  body: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return secureApiRequest<T>(endpoint, { method: 'PUT', body, headers });
}

/**
 * Make a secure DELETE request
 */
export async function secureDelete<T = any>(
  endpoint: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return secureApiRequest<T>(endpoint, { method: 'DELETE', headers });
}

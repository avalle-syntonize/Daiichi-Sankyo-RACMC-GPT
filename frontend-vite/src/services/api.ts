/**
 * API Service for secure backend communication
 *
 * SECURITY PATTERN:
 * This service implements the secure pattern for SWA + Azure Functions:
 *
 * 1. Access tokens are acquired on-demand via MSAL (never stored in state)
 * 2. Tokens are added to requests via Authorization header
 * 3. The Azure Function validates the token server-side
 * 4. If token acquisition fails, user is redirected to login
 *
 * This prevents:
 * - Token exposure in localStorage (we use sessionStorage)
 * - Token replay attacks (tokens have short expiry, MSAL handles refresh)
 * - Direct API access via Postman (backend validates the token)
 */

// Get access token function type (injected from AuthContext)
type GetAccessTokenFn = () => Promise<string | null>;

// Store the getAccessToken function reference
let getAccessTokenFn: GetAccessTokenFn | null = null;

/**
 * Initialize the API service with the getAccessToken function
 * This should be called once when the app initializes
 */
export const initializeApiService = (getAccessToken: GetAccessTokenFn): void => {
  getAccessTokenFn = getAccessToken;
};

/**
 * API base URL - uses the SWA proxy for Azure Functions
 * In SWA, /api/* routes are automatically proxied to Azure Functions
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Response type for API calls
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
}

/**
 * Generic fetch wrapper with authentication
 *
 * @param endpoint - API endpoint (relative to API_BASE_URL)
 * @param options - Fetch options
 * @returns Promise with API response
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Get access token
  if (!getAccessTokenFn) {
    throw new ApiError('API service not initialized', 500, 'SERVICE_NOT_INITIALIZED');
  }

  const token = await getAccessTokenFn();

  // If no token and we need one, throw error
  // The AuthContext will handle redirecting to login
  if (!token) {
    throw new ApiError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
  }

  // Build request URL
  const url = `${API_BASE_URL}${endpoint}`;

  // Build headers with Authorization
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // Include credentials for cookie-based auth if needed
      credentials: 'include',
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorCode = 'HTTP_ERROR';

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code || errorCode;
      } catch {
        // Response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    // Parse response
    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * API methods for the application
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Chat-specific API methods
 */
export const chatApi = {
  /**
   * Send a message to the chat API
   */
  sendMessage: async (message: string, filters?: string[]) => {
    interface ChatResponse {
      response: string;
      citations?: Array<{
        id: string;
        title: string;
        content: string;
        url?: string;
      }>;
    }

    return api.post<ChatResponse>('/chat', {
      message,
      filters,
    });
  },

  /**
   * Get conversation history
   */
  getHistory: async () => {
    interface HistoryResponse {
      conversations: Array<{
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }

    return api.get<HistoryResponse>('/chat/history');
  },

  /**
   * Export conversation
   */
  exportConversation: async (conversationId: string, format: 'txt' | 'pdf' | 'docx') => {
    interface ExportResponse {
      downloadUrl: string;
    }

    return api.post<ExportResponse>(`/chat/export/${conversationId}`, { format });
  },
};

export default api;

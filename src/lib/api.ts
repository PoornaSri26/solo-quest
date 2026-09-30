// Centralized API client with retry logic, timeout handling, and error management
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// Server retries from this client must never double-apply rewards or
// purchases: every mutating request carries an Idempotency-Key, and the
// same key survives the retry loop below.
const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
};

const idempotentMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipValidation?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Response validation
const validateResponse = <T>(data: any, endpoint: string): T => {
  // Basic validation - ensure response is not null/undefined
  if (data === null || data === undefined) {
    console.warn(`[API] Invalid response from ${endpoint}: null/undefined`);
    throw new ApiError('Invalid response: null/undefined', 500);
  }

  // Validate common response structures
  if (typeof data === 'object' && data !== null) {
    // Check for error responses
    if (data.error && typeof data.error === 'string') {
      throw new ApiError(data.error, data.status || 400, data);
    }

    // Check for success boolean flag
    if (data.success === false) {
      throw new ApiError(data.message || 'Request failed', data.status || 400, data);
    }
  }

  return data as T;
};

// Request logging
const logRequest = (method: string, endpoint: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${method} ${endpoint}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Response logging
const logResponse = (method: string, endpoint: string, data: any, status: number) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${method} ${endpoint} - ${status}`, data);
  }
};

// Error logging
const logError = (method: string, endpoint: string, error: any) => {
  console.error(`[API ERROR] ${method} ${endpoint}`, error);
};

const apiClient = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const {
    timeout = 30000, // 30 second default timeout
    retries = 3,
    retryDelay = 1000,
    headers = {},
    skipAuth = false,
    skipValidation = false,
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  let lastError: Error | null = null;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  // One key per logical operation — reused across the retry loop so the
  // server treats every retry as the same request.
  const idempotencyKey = idempotentMethods.has(method) ? generateIdempotencyKey() : null;

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Log request (only on first attempt to avoid spam)
      if (attempt === 0) {
        logRequest(method, endpoint, fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        logError(method, endpoint, { status: response.status, data });
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new ApiError('Authentication required', 401, data);
        }
        if (response.status === 403) {
          throw new ApiError('Access forbidden', 403, data);
        }
        if (response.status === 404) {
          throw new ApiError('Resource not found', 404, data);
        }
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          throw new ApiError(`Too many requests. Retry after ${retryAfter}s`, 429, data);
        }
        if (response.status === 500) {
          throw new ApiError('Server error', 500, data);
        }
        
        throw new ApiError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      // Parse JSON response
      const data = await response.json();
      
      // Log response
      logResponse(method, endpoint, data, response.status);

      // Validate response unless explicitly skipped
      if (!skipValidation) {
        return validateResponse<T>(data, endpoint);
      }

      return data as T;

    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout) or 4xx errors (except 429)
      if (error instanceof ApiError && error.status) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }

      // Retry on network errors or 5xx errors
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new ApiError('Request failed');
};

// Convenience methods for common HTTP operations
export const api = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),

  put: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

// Authenticated API client with automatic token injection
export const createAuthApi = (getToken: () => string | null) => ({
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    api.get<T>(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    api.post<T>(endpoint, data, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    api.patch<T>(endpoint, data, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    api.delete<T>(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }),

  put: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    api.put<T>(endpoint, data, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${getToken()}`,
      },
    }),
});

export { ApiError };
export default api;

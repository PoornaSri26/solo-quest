// Centralized API client with retry logic, timeout handling, and error management
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
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
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
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

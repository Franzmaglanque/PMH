/**
 * API Client Wrapper
 * Centralized fetch wrapper that automatically includes authentication tokens
 * and handles common API configurations
 */

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Makes authenticated API requests to the backend
 * @param endpoint - API endpoint (e.g., '/batch/validate')
 * @param options - Fetch options with optional skipAuth flag
 * @returns Parsed JSON response
 */
export const apiClient = async <T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> => {
  const { skipAuth = false, ...fetchOptions } = options;
  const token = getToken();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add Authorization header if token exists and auth is not skipped
  if (token && !skipAuth) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
  };

  const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
  const response = await fetch(url, config);

  if (!response.ok) {
    const errorMessage = `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * Helper function to get user data from localStorage
 */
export const getUser = <T = any>(): T | null => {
  if (typeof window === 'undefined') return null;
  const userString = localStorage.getItem('user');
  return userString ? JSON.parse(userString) : null;
};

/**
 * Helper function to get auth token
 */
export const getAuthToken = (): string | null => {
  return getToken();
};

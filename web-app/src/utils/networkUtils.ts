/**
 * Utility to check network connectivity and service reachability.
 */

export const isNetworkAvailable = async (): Promise<boolean> => {
  // 1. Basic Browser Check
  // In some embedded webviews (like VSCode preview), navigator.onLine might be unreliable.
  // We will treat "false" as suspicious but not definitive if we can ping.
  if (navigator.onLine) {
    return true;
  }

  // 2. Fallback Ping for "False Positives" on Offline status
  // Try to fetch a tiny, CORS-friendly resource (e.g., a favicon or just a HEAD request to self)
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Retries a promise-returning function with exponential backoff.
 * @param fn The function to execute
 * @param retries Max number of retries
 * @param delay Initial delay in ms
 */
export const retryOperation = async <T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Only retry on network errors
    const isNetworkError = 
      error?.code === 'auth/network-request-failed' || 
      error?.message?.includes('network') ||
      error?.message?.includes('failed to fetch');

    if (retries > 0 && isNetworkError) {
      console.warn(`Network error detected. Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

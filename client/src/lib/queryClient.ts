import { QueryClient, type QueryFunction } from "@tanstack/react-query";
import { toast } from "sonner";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  retries = 3,
  baseTimeout = 2000,
  maxTimeout = 5000,
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    // Exponential backoff timeout (2s → 4s → max 5s)
    const timeout = Math.min(baseTimeout * 2 ** attempt, maxTimeout);

    try {
      // Setup abort controller for timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!res.ok) {
        toast.error("API Request failed", {
          description: `${method} ${url} failed with status ${res.status}`,
        });
      }

      return res; // success, return response
    } catch (err) {
      // Retry only if timeout or network error
      if (attempt < retries - 1) {
        console.warn(`Retrying ${method} ${url} (attempt ${attempt + 2})...`);
        continue;
      }

      // All retries failed → show toast and rethrow
      toast.error("API Request failed", {
        description: `${method} ${url} failed after ${retries} attempts`,
      });
      throw err;
    }
  }

  // This should never happen, but TypeScript needs it
  throw new Error("Unexpected error in apiRequest");
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

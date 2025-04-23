import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData: any = { message: res.statusText };
    
    try {
      // Try to parse response as JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const clone = res.clone(); // Clone the response since it can only be read once
        errorData = await clone.json();
      } else {
        errorData.message = await res.text() || res.statusText;
      }
    } catch (error) {
      console.error('Error parsing API error response', error);
      // If parsing fails, use the status text
      errorData.message = res.statusText;
    }
    
    const customError: any = new Error(errorData.error || errorData.message || `API Error: ${res.status}`);
    customError.status = res.status;
    customError.response = res;
    customError.data = errorData;
    
    throw customError;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Make sure we're using the correct URL format
  const apiUrl = url.startsWith('/') ? url : `/${url}`;
  
  console.log(`Making ${method} request to ${apiUrl}`);
  
  const res = await fetch(apiUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    console.error(`API request failed: ${res.status} ${res.statusText}`, { url: apiUrl, method });
  }
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Make sure we're using the correct URL format
    const url = queryKey[0] as string;
    const apiUrl = url.startsWith('/') ? url : `/${url}`;
    
    console.log(`Making GET request to ${apiUrl}`);
    
    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    
    if (!res.ok) {
      console.error(`Query request failed: ${res.status} ${res.statusText}`, { url: apiUrl });
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

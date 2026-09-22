import { QueryClient, QueryFunction } from "@tanstack/react-query";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function resolveUrl(url: string) {
  if (url.startsWith("/") && apiBase) {
    return `${apiBase}${url}`;
  }
  return url;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const resolvedUrl = resolveUrl(url.startsWith("/") ? url : `/${url}`);
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("auth_token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(resolvedUrl, {
    ...options,
    headers,
    credentials: "include",
  });
  if (res.status === 401) {
    localStorage.removeItem("auth_token");
  }
  return res;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const resolvedUrl = resolveUrl(url);
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(resolvedUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
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
    const path = queryKey.join("/");
    const resolvedUrl = resolveUrl(path.startsWith("/") ? path : `/${path}`);
    const headers: Record<string, string> = {};
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(resolvedUrl, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
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

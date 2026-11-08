import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // Auth mutations must never be retried silently (duplicate sign-ups, burned codes).
      retry: false,
    },
  },
});

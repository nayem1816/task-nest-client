'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import { AuthProvider } from '@/lib/auth/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  // The chat widget runs inside other people's websites for anonymous
  // visitors. It must not look for a member session.
  const isWidget = usePathname().startsWith('/widget/');
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx only repeats the same answer.
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  if (isWidget) return children;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

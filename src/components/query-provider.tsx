
"use client";

import type * as React from 'react';
import { useState } from 'react'; // Import useState
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Remove the client creation from the top level

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create the QueryClient instance inside the component using useState
  // This ensures that data is not shared between different users and requests,
  // while still only creating the QueryClient once per component lifecycle.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

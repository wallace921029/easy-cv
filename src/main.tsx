import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "@/components/app/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { router } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // "Refetch when the page becomes visible again" is the whole sync story.
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: (failureCount, error) => {
        // 4xx errors are deterministic; only network errors and 5xx get a retry.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

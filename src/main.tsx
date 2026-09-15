import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/app/theme-provider";
import { I18nProvider } from "@/components/app/i18n-provider";
import { AppRoot } from "@/components/app/app-root";
import { ApiError } from "@/lib/api";
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
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppRoot />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);

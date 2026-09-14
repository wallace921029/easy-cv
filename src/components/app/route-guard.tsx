import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { sessionEvents, sessionState } from "@/lib/api";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "./full-page-spinner";
import { useMe } from "@/queries/auth";
import { useSystemStatus } from "@/queries/system";

export type GuardKind = "setup" | "auth" | "user" | "admin";

// Only same-origin absolute paths are allowed as redirect targets.
export function sanitizeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

export function RouteGuard({ kind, children }: { kind: GuardKind; children: ReactNode }) {
  const statusQuery = useSystemStatus();
  const meQuery = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    return sessionEvents.subscribe(() => {
      queryClient.setQueryData(["auth", "me"], null);
      navigate(`/login?expired=1`, { replace: true });
    });
  }, [navigate, queryClient]);

  if (statusQuery.isLoading || meQuery.isLoading) {
    return <FullPageSpinner />;
  }

  if (statusQuery.isError || meQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{strings.errors.network}</p>
        <Button
          variant="outline"
          onClick={() => {
            void statusQuery.refetch();
            void meQuery.refetch();
          }}
        >
          {strings.common.retry}
        </Button>
      </div>
    );
  }

  const status = statusQuery.data;
  const me = meQuery.data ?? null;

  if (!status?.initialized) {
    if (kind !== "setup") {
      return <Navigate to="/setup" replace />;
    }
    return <>{children}</>;
  }

  if (kind === "setup") {
    return <Navigate to={me ? "/" : "/login"} replace />;
  }

  if ((kind === "user" || kind === "admin") && !me) {
    const redirect = sanitizeRedirect(location.pathname + location.search);
    const expired = Date.now() - sessionState.expiredAt < 10_000;
    const suffix = expired ? "?expired=1&" : "?";
    return <Navigate to={`/login${suffix}redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (kind === "admin" && me?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  if (kind === "auth" && me) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

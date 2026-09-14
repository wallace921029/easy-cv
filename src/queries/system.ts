import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system", "status"],
    queryFn: () => api.system.status(),
  });
}

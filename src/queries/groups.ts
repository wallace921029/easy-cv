import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const groupsKey = ["groups"] as const;
export function useGroups() {
  return useQuery({ queryKey: groupsKey, queryFn: api.groups.list, select: (data) => data.items });
}

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateGames() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [queryClient.invalidateQueries()];
  }, [queryClient]);
}

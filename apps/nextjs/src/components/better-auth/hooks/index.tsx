import { useQuery } from "@tanstack/react-query";

import { authClient } from "~/auth/client";

export function useListAccounts() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["listAccounts"],
    queryFn: async () => {
      const accounts = await authClient.listAccounts();
      if (accounts.error) {
        throw new Error(accounts.error.message);
      }
      return accounts.data;
    },
  });

  return { accounts, isLoading };
}

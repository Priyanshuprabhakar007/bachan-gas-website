import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertInventorySchema } from "@shared/schema";
import { z } from "zod";

type UpdateInventoryInput = Partial<z.infer<typeof insertInventorySchema>>;

export function useInventory() {
  return useQuery({
    queryKey: [api.inventory.list.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return api.inventory.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateInventoryInput) => {
      const res = await fetch(api.inventory.update.path.replace(":id", id.toString()), {
        method: api.inventory.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      return api.inventory.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] });
    },
  });
}

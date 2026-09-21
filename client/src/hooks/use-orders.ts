import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertOrderSchema } from "@shared/schema";
import { resolveUrl } from "@/lib/queryClient";

type CreateOrderInput = z.infer<typeof insertOrderSchema> & {
  items: { productId: number; quantity: number }[];
};

export function useOrders(phone?: string) {
  const queryParam = phone ? `?phone=${encodeURIComponent(phone)}` : "";
  return useQuery({
    queryKey: [api.orders.list.path, phone || "all"],
    queryFn: async () => {
      const res = await fetch(resolveUrl(`${api.orders.list.path}${queryParam}`), {
        credentials: "include",
      });
      if (res.status === 401) {
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch orders");
      return api.orders.list.responses[200].parse(await res.json());
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const res = await fetch(resolveUrl(api.orders.get.path.replace(":id", id.toString())), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch order");
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const res = await fetch(resolveUrl(api.orders.create.path), {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}

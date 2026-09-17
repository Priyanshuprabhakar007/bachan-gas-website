import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, TrendingUp, PackageCheck, IndianRupee } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, User } from "@shared/schema";

const ORDER_STATUSES = ["NEW", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

function getStatusBadgeProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (status) {
    case "NEW":
      return { variant: "default", className: "" };
    case "CONFIRMED":
      return { variant: "outline", className: "text-blue-400 border-blue-400/50" };
    case "OUT_FOR_DELIVERY":
      return { variant: "secondary", className: "bg-yellow-500/15 text-yellow-400" };
    case "DELIVERED":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    case "CANCELLED":
      return { variant: "destructive", className: "" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function getPaymentBadgeProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (status) {
    case "PAID":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    case "UNPAID":
      return { variant: "secondary", className: "bg-red-500/15 text-red-400" };
    case "PARTIAL":
      return { variant: "secondary", className: "bg-yellow-500/15 text-yellow-400" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: deliveryMen } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/staff/delivery-men"],
  });

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, deliveryManId }: { orderId: number; deliveryManId: number }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/assign`, { deliveryManId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Delivery man assigned" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, active: 0, delivered: 0, revenue: 0 };
    return {
      total: orders.length,
      active: orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      revenue: orders.reduce((sum, o) => sum + (o.totalPaise ?? 0), 0),
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="p-6" data-testid="orders-loading">
        <h1 className="text-2xl font-semibold mb-6">Orders</h1>
        <OrdersSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="orders-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Orders</h1>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} data-testid="tabs-status-filter">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="NEW" data-testid="tab-new">New</TabsTrigger>
          <TabsTrigger value="CONFIRMED" data-testid="tab-confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="OUT_FOR_DELIVERY" data-testid="tab-out-for-delivery">Out for Delivery</TabsTrigger>
          <TabsTrigger value="DELIVERED" data-testid="tab-delivered">Delivered</TabsTrigger>
          <TabsTrigger value="CANCELLED" data-testid="tab-cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orders">{stats.total}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-active-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-orders">{stats.active}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-delivered-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-delivered-orders">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">{formatCurrency(stats.revenue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-orders">
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Delivery Man</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const statusProps = getStatusBadgeProps(order.status ?? "NEW");
                  const paymentProps = getPaymentBadgeProps(order.paymentStatus ?? "UNPAID");
                  return (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-name-${order.id}`}>
                        {order.customerName}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${order.id}`}>
                        {order.phone}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="cursor-pointer"
                              data-testid={`button-status-${order.id}`}
                              disabled={statusMutation.isPending}
                            >
                              <Badge
                                variant={statusProps.variant}
                                className={statusProps.className}
                              >
                                {formatStatusLabel(order.status ?? "NEW")}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" data-testid={`dropdown-status-${order.id}`}>
                            {ORDER_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                data-testid={`menu-item-status-${s.toLowerCase()}-${order.id}`}
                                onClick={() => statusMutation.mutate({ id: order.id, status: s })}
                                disabled={order.status === s}
                              >
                                {formatStatusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell data-testid={`text-total-${order.id}`}>
                        {formatCurrency(order.totalPaise || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={paymentProps.variant}
                          className={paymentProps.className}
                          data-testid={`badge-payment-${order.id}`}
                        >
                          {order.paymentStatus ?? "UNPAID"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-payment-mode-${order.id}`}>
                        {order.paymentMode ?? "-"}
                      </TableCell>
                      <TableCell data-testid={`cell-delivery-man-${order.id}`}>
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
                          <Select
                            value={order.deliveryManId?.toString() || ""}
                            onValueChange={(val) => {
                              if (val) assignMutation.mutate({ orderId: order.id, deliveryManId: Number(val) });
                            }}
                            disabled={assignMutation.isPending}
                          >
                            <SelectTrigger data-testid={`select-delivery-${order.id}`}>
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent data-testid={`select-content-delivery-${order.id}`}>
                              {deliveryMen?.map((dm) => (
                                <SelectItem key={dm.id} value={dm.id.toString()} data-testid={`option-delivery-${dm.id}-${order.id}`}>
                                  {dm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground" data-testid={`text-delivery-man-${order.id}`}>
                            {deliveryMen?.find(dm => dm.id === order.deliveryManId)?.name || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-date-${order.id}`}>
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

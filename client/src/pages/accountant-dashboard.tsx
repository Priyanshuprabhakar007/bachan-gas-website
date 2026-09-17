import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IndianRupee,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  CreditCard,
} from "lucide-react";
import type { Order } from "@shared/schema";

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

const PAYMENT_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "secondary",
  UNPAID: "destructive",
  COD: "outline",
  PARTIAL: "outline",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
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
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    </div>
  );
}

export default function AccountantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("PATCH", `/api/orders/${orderId}/status`, { paymentStatus: "PAID" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Payment updated", description: "COD payment marked as received." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    },
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.totalPaise || 0), 0) ?? 0;
  const codPending =
    orders?.filter(
      (o) => o.paymentMode === "CASH" && o.paymentStatus !== "PAID" && o.status === "DELIVERED"
    ).length ?? 0;
  const paidOrders = orders?.filter((o) => o.paymentStatus === "PAID").length ?? 0;
  const unpaidOrders = orders?.filter((o) => o.paymentStatus !== "PAID").length ?? 0;

  const statCards = [
    { title: "Total Revenue", value: formatCurrency(totalRevenue), icon: IndianRupee, color: "text-green-500" },
    { title: "COD Pending", value: codPending, icon: Clock, color: "text-orange-500" },
    { title: "Paid Orders", value: paidOrders, icon: CheckCircle, color: "text-blue-500" },
    { title: "Unpaid Orders", value: unpaidOrders, icon: XCircle, color: "text-red-500" },
  ];

  const handleExportCSV = () => {
    if (!orders || orders.length === 0) {
      toast({ variant: "destructive", title: "No data", description: "No orders to export." });
      return;
    }

    const headers = ["Order #", "Customer", "Phone", "Total", "Payment Mode", "Payment Status", "Order Status", "Date"];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.phone,
      ((o.totalPaise || 0) / 100).toFixed(2),
      o.paymentMode || "",
      o.paymentStatus || "",
      o.status || "",
      o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `orders-export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: "CSV file downloaded." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold" data-testid="text-accountant-dashboard-title">
            Accountant Dashboard
          </h1>
          <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid={`text-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="card-orders-table">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Orders &amp; Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Payment Mode</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Order Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const isCodDelivered =
                            order.paymentMode === "CASH" &&
                            order.paymentStatus !== "PAID" &&
                            order.status === "DELIVERED";

                          return (
                            <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                              <TableCell className="font-medium" data-testid={`text-order-number-${order.id}`}>
                                {order.orderNumber}
                              </TableCell>
                              <TableCell data-testid={`text-customer-${order.id}`}>
                                {order.customerName}
                              </TableCell>
                              <TableCell data-testid={`text-total-${order.id}`}>
                                {formatCurrency(order.totalPaise || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="no-default-hover-elevate" data-testid={`badge-payment-mode-${order.id}`}>
                                  {order.paymentMode || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={PAYMENT_BADGE_VARIANT[order.paymentStatus || "UNPAID"] || "outline"}
                                  className="no-default-hover-elevate"
                                  data-testid={`badge-payment-status-${order.id}`}
                                >
                                  {order.paymentStatus || "UNPAID"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="no-default-hover-elevate" data-testid={`badge-order-status-${order.id}`}>
                                  {(order.status || "NEW").replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm" data-testid={`text-date-${order.id}`}>
                                {order.createdAt
                                  ? new Date(order.createdAt).toLocaleDateString("en-IN")
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {isCodDelivered ? (
                                  <Button
                                    size="sm"
                                    onClick={() => markPaidMutation.mutate(order.id)}
                                    disabled={markPaidMutation.isPending}
                                    data-testid={`button-mark-paid-${order.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Received
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground" data-testid="text-no-orders">
                      No orders found.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

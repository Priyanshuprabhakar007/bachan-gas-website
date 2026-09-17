import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ShoppingCart, IndianRupee, Users, Ticket, CreditCard, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardStats } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  NEW: "#3b82f6",
  CONFIRMED: "#8b5cf6",
  OUT_FOR_DELIVERY: "#f59e0b",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
  REJECTED: "#6b7280",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "default",
  CONFIRMED: "secondary",
  OUT_FOR_DELIVERY: "outline",
  DELIVERED: "secondary",
  CANCELLED: "destructive",
  REJECTED: "destructive",
};

const PAYMENT_STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCESS: "secondary",
  INITIATED: "outline",
  FAILED: "destructive",
  ABORTED: "destructive",
};

function maskPhone(phone: string): string {
  if (!phone || phone === "-") return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return digits.slice(0, -4).replace(/./g, "*") + digits.slice(-4);
}

function formatCylinderType(type: string): string {
  switch (type) {
    case "DOMESTIC_14": return "14.2kg Domestic";
    case "COMMERCIAL_19": return "19kg Commercial";
    case "LARGE_47": return "47kg Large";
    case "COMPOSITE": return "Composite";
    default: return type;
  }
}

function formatRevenue(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleDownloadExcel = () => {
    const link = document.createElement("a");
    link.href = "/api/admin/payments/export";
    link.click();
  };

  const copyPhone = (phone: string) => {
    if (!phone || phone === "-") return;
    navigator.clipboard.writeText(phone);
    toast({ title: "Copied", description: "Phone number copied" });
  };

  if (isLoading || !stats) {
    return (
      <div className="p-6" data-testid="dashboard-loading">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString("en-IN"),
      icon: ShoppingCart,
      color: "text-blue-500",
    },
    {
      title: "Revenue",
      value: formatRevenue(stats.totalRevenuePaise),
      icon: IndianRupee,
      color: "text-green-500",
    },
    {
      title: "Online Payments",
      value: stats.directPayments?.total.toLocaleString("en-IN") || "0",
      icon: CreditCard,
      color: "text-cyan-500",
    },
    {
      title: "Active Customers",
      value: stats.totalCustomers.toLocaleString("en-IN"),
      icon: Users,
      color: "text-purple-500",
    },
    {
      title: "Open Tickets",
      value: stats.openTickets.toLocaleString("en-IN"),
      icon: Ticket,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-orders-by-status">
          <CardHeader>
            <CardTitle className="text-lg">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ordersByStatus && stats.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(v: string) =>
                      v.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                    }
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    fill="#3b82f6"
                    label={false}
                  >
                    {stats.ordersByStatus.map((entry, index) => (
                      <rect
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || "#3b82f6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-orders">
                No order data available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-inventory-overview">
          <CardHeader>
            <CardTitle className="text-lg">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.inventorySummary && stats.inventorySummary.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cylinder Type</TableHead>
                    <TableHead className="text-right">Filled</TableHead>
                    <TableHead className="text-right">Empty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.inventorySummary.map((item) => (
                    <TableRow key={item.type} data-testid={`row-inventory-${item.type}`}>
                      <TableCell className="font-medium">
                        {formatCylinderType(item.type)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 no-default-hover-elevate">
                          {item.filled}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 no-default-hover-elevate">
                          {item.empty}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-inventory">
                No inventory data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-orders">
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium" data-testid={`text-order-number-${order.id}`}>
                      {order.orderNumber}
                    </TableCell>
                    <TableCell data-testid={`text-order-customer-${order.id}`}>
                      {order.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[order.status || "NEW"] || "outline"}
                        data-testid={`badge-order-status-${order.id}`}
                      >
                        {(order.status || "NEW").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-order-total-${order.id}`}>
                      {formatRevenue(order.totalPaise || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground" data-testid={`text-order-date-${order.id}`}>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm" data-testid="text-no-recent-orders">
              No recent orders.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-recent-payments">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-500" />
            Recent Payments (CCAvenue)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel} data-testid="button-download-excel">
            <Download className="h-4 w-4 mr-1.5" />
            Download Excel
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentPayments && stats.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-payment-txn-${payment.id}`}>
                        {payment.merchantTxnId}
                      </TableCell>
                      <TableCell data-testid={`text-payment-customer-${payment.id}`}>
                        {payment.customerName || "Unknown"}
                      </TableCell>
                      <TableCell data-testid={`text-payment-mobile-${payment.id}`}>
                        <span className="flex items-center gap-1">
                          <span className="text-sm">
                            {isAdmin ? (payment.customerPhone || "-") : maskPhone(payment.customerPhone || "")}
                          </span>
                          {isAdmin && payment.customerPhone && payment.customerPhone !== "-" && (
                            <button
                              onClick={() => copyPhone(payment.customerPhone || "")}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Copy phone number"
                              data-testid={`button-copy-phone-${payment.id}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={payment.orderId ? "text-blue-400" : "text-cyan-400"}
                          data-testid={`badge-payment-type-${payment.id}`}
                        >
                          {payment.orderId ? `Order #${payment.orderId}` : "Direct"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={PAYMENT_STATUS_BADGE[payment.status] || "outline"}
                          data-testid={`badge-payment-status-${payment.id}`}
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-payment-amount-${payment.id}`}>
                        {formatRevenue(payment.baseAmountPaise)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-payment-fee-${payment.id}`}>
                        {formatRevenue(payment.convenienceFeeAmountPaise)}
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-payment-total-${payment.id}`}>
                        {formatRevenue(payment.totalAmountPaise)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-payment-date-${payment.id}`}>
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString("en-IN")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm" data-testid="text-no-recent-payments">
              No payment transactions yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

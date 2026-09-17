import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndianRupee, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import type { Order } from "@shared/schema";

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

function getPaymentBadgeProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (status) {
    case "PAID":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    case "UNPAID":
      return { variant: "destructive", className: "" };
    case "PARTIAL":
      return { variant: "secondary", className: "bg-yellow-500/15 text-yellow-400" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
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

export default function BillingPage() {
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    if (!orders) return { totalBilled: 0, paid: 0, unpaid: 0, partial: 0 };
    return {
      totalBilled: orders.reduce((sum, o) => sum + (o.totalPaise ?? 0), 0),
      paid: orders.filter((o) => o.paymentStatus === "PAID").length,
      unpaid: orders.filter((o) => o.paymentStatus === "UNPAID").length,
      partial: orders.filter((o) => o.paymentStatus === "PARTIAL").length,
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="p-6" data-testid="billing-loading">
        <h1 className="text-2xl font-semibold mb-6">Billing</h1>
        <BillingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="billing-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Billing</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search-billing"
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-billed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-billed">{formatCurrency(stats.totalBilled)}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-paid-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-paid-count">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-unpaid-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unpaid-count">{stats.unpaid}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-partial-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partial</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-partial-count">{stats.partial}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-billing">
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No billing records found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => {
                  const paymentProps = getPaymentBadgeProps(order.paymentStatus ?? "UNPAID");
                  return (
                    <TableRow key={order.id} data-testid={`row-billing-${order.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-name-${order.id}`}>
                        {order.customerName}
                      </TableCell>
                      <TableCell data-testid={`text-total-amount-${order.id}`}>
                        {formatCurrency(order.totalPaise || 0)}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-payment-mode-${order.id}`}>
                        {order.paymentMode ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={paymentProps.variant}
                          className={paymentProps.className}
                          data-testid={`badge-payment-status-${order.id}`}
                        >
                          {order.paymentStatus ?? "UNPAID"}
                        </Badge>
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

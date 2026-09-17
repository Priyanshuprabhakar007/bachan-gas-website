import { DashboardLayout } from "@/components/layout-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, CreditCard, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";

interface PaymentSettings {
  ccavenueEnabled: boolean;
  ccavenueFeeEnabled: boolean;
  ccavenueFeePercent: string;
  ccavenueRoundingMode: string;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "CANCELLED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "OUT_FOR_DELIVERY":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "CONFIRMED":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    default:
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  }
}

function getPaymentStyle(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    default:
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  }
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default function CustomerHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const storedPhone = user?.phone || (typeof window !== "undefined" ? localStorage.getItem("customer_phone") || undefined : undefined);
  const { data: orders, isLoading } = useOrders(storedPhone);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);

  const { data: paymentSettings } = useQuery<PaymentSettings>({
    queryKey: ["/api/payment/settings"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const initiateMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", "/api/payments/ccavenue/initiate", { orderId });
      return res.json();
    },
    onSuccess: (data: { formHtml: string }) => {
      setPayingOrderId(null);
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.formHtml, "text/html");
      const parsedForm = doc.querySelector("form");
      if (parsedForm) {
        const form = document.createElement("form");
        form.method = parsedForm.method || "post";
        form.action = parsedForm.action || "";
        form.style.display = "none";
        parsedForm.querySelectorAll("input").forEach((input) => {
          const clone = document.createElement("input");
          clone.type = "hidden";
          clone.name = input.name;
          clone.value = input.value;
          form.appendChild(clone);
        });
        document.body.appendChild(form);
        form.submit();
      }
    },
    onError: (err: Error) => {
      setPayingOrderId(null);
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    },
  });

  const myOrders = orders || [];
  const ccavenueAvailable = paymentSettings?.ccavenueEnabled ?? false;

  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Order History</h1>
            <p className="text-muted-foreground mt-1">View all your past and current bookings.</p>
          </div>
          <Link href="/account/book-refill">
            <Button data-testid="button-book-cylinder">
              <Flame className="mr-2 h-4 w-4" /> Book Cylinder
            </Button>
          </Link>
        </div>

        <Card className="border-white/10 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              All Orders
            </CardTitle>
            <CardDescription>{myOrders.length} total orders</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No orders found. Book your first cylinder!</p>
                <Link href="/account/book-refill">
                  <Button data-testid="button-book-first">Book Now</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-white/5 rounded-md p-4 space-y-3"
                    data-testid={`card-order-${order.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Flame className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white" data-testid={`text-order-number-${order.id}`}>
                            {order.orderNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a") : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={getStatusStyle(order.status ?? "NEW")}
                          data-testid={`badge-status-${order.id}`}
                        >
                          {formatStatusLabel(order.status ?? "NEW")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getPaymentStyle(order.paymentStatus ?? "UNPAID")}
                          data-testid={`badge-payment-${order.id}`}
                        >
                          {order.paymentStatus ?? "UNPAID"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pl-13">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{order.addressLine}, {order.city}</span>
                        {order.paymentMode && (
                          <span>Mode: {order.paymentMode}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-lg" data-testid={`text-amount-${order.id}`}>
                          ₹{order.totalAmount}
                        </span>
                        {ccavenueAvailable && order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            data-testid={`button-pay-online-${order.id}`}
                            onClick={() => setPayingOrderId(order.id)}
                            disabled={initiateMutation.isPending}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Pay Online
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {payingOrderId && (
          <Dialog open={!!payingOrderId} onOpenChange={(open) => { if (!open) setPayingOrderId(null); }}>
            <DialogContent data-testid="dialog-pay-online">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pay Online via CCAvenue
                </DialogTitle>
                <DialogDescription>
                  You will be redirected to CCAvenue's secure payment page to complete your payment.
                  {paymentSettings?.ccavenueFeeEnabled && paymentSettings?.ccavenueFeePercent && (
                    <span className="block mt-1">
                      A convenience fee of {paymentSettings.ccavenueFeePercent}% will be added to the order total.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPayingOrderId(null)}
                  disabled={initiateMutation.isPending}
                  data-testid="button-cancel-pay"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => initiateMutation.mutate(payingOrderId)}
                  disabled={initiateMutation.isPending}
                  data-testid="button-confirm-pay"
                >
                  {initiateMutation.isPending ? "Redirecting..." : "Proceed to Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}

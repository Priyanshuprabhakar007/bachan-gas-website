import { DashboardLayout } from "@/components/layout-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Clock, CalendarDays, ArrowRight, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

export default function CustomerDashboard() {
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

  // Filter orders for this specific customer
  const myOrders = orders?.filter(o => 
    (user?.id && o.userId === user.id) || 
    (storedPhone && o.phone === storedPhone)
  ) || [];
  const latestOrder = myOrders[0];
  const ccavenueAvailable = paymentSettings?.ccavenueEnabled ?? false;

  return (
    <DashboardLayout role="customer">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {user?.name || storedPhone || "Customer"}</h1>
            <p className="text-muted-foreground mt-1">Manage your gas connection and bookings.</p>
          </div>
          <Link href="/account/book-refill">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <Flame className="mr-2 h-5 w-5" /> Book Cylinder
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{myOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime orders</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Consumer ID</CardTitle>
              <Flame className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{user?.consumerId || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Primary Connection</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Delivery</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {latestOrder?.deliveryDate ? format(new Date(latestOrder.deliveryDate), "MMM d, yyyy") : 
                 latestOrder?.createdAt ? format(new Date(latestOrder.createdAt), "MMM d, yyyy") : 
                 "No deliveries yet"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestOrder?.status === 'DELIVERED' ? 'Successfully Delivered' : 
                 latestOrder ? 'Pending Delivery' : 'Pending'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-white/10 bg-card/50">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest booking history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">You haven't made any bookings yet.</p>
                <Link href="/account/book-refill">
                  <Button variant="outline">Book Now</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Flame className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.createdAt!), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {order.status}
                      </div>
                      <div className="font-bold text-white">₹{order.totalAmount}</div>
                      {ccavenueAvailable && order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          data-testid={`button-pay-online-${order.id}`}
                          onClick={(e) => { e.stopPropagation(); setPayingOrderId(order.id); }}
                          disabled={initiateMutation.isPending}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Link href="/account/history">
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary mt-2">
                    View All History <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
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

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout-dashboard";
import { Navbar } from "@/components/layout-navbar";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, IndianRupee, Loader2, AlertCircle, Shield, User } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface PaymentFormProps {
  isLoggedIn: boolean;
  initialAmount?: string;
  initialPurpose?: string;
  userName?: string | null;
}

function PaymentForm({ isLoggedIn, initialAmount, initialPurpose, userName }: PaymentFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState(initialAmount || "");
  const [purpose, setPurpose] = useState(initialPurpose || "");
  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError] = useState("");
  const paymentContainerRef = useRef<HTMLDivElement>(null);

  const needsName = isLoggedIn && (!userName || userName === "Customer");

  const { data: paymentSettings, isLoading: settingsLoading } = useQuery<{
    ccavenueEnabled: boolean;
    ccavenueFeePercent: string;
    ccavenueFeeEnabled: boolean;
  }>({
    queryKey: ["/api/payment/settings"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const payMutation = useMutation({
    mutationFn: async (data: { amountRupees: number; purpose?: string; customerName?: string }) => {
      const res = await apiRequest("POST", "/api/payments/ccavenue/direct", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (data.formHtml && paymentContainerRef.current) {
        paymentContainerRef.current.innerHTML = data.formHtml;
        const form = paymentContainerRef.current.querySelector("form");
        if (form) form.submit();
      }
    },
    onError: (err: Error) => {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    },
  });

  const amountNum = parseFloat(amount) || 0;
  const feePercent = parseFloat(paymentSettings?.ccavenueFeePercent || "0.25");
  const feeAmount = paymentSettings?.ccavenueFeeEnabled ? amountNum * (feePercent / 100) : 0;
  const totalAmount = amountNum + feeAmount;

  const handlePay = () => {
    if (!isLoggedIn) {
      const params = new URLSearchParams();
      params.set("redirect", "/account/make-a-payment");
      if (amount) params.set("amount", amount);
      if (purpose) params.set("purpose", purpose);
      navigate(`/login?${params.toString()}`);
      return;
    }
    if (amountNum < 1) {
      toast({ title: "Invalid Amount", description: "Please enter an amount of at least 1 rupee", variant: "destructive" });
      return;
    }
    if (needsName && customerName.trim().length < 2) {
      setNameError("Please enter your name (at least 2 characters)");
      return;
    }
    setNameError("");
    payMutation.mutate({
      amountRupees: amountNum,
      purpose: purpose || undefined,
      ...(needsName ? { customerName: customerName.trim() } : {}),
    });
  };

  const ccavenueEnabled = paymentSettings?.ccavenueEnabled ?? false;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card data-testid="card-direct-payment">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Online
          </CardTitle>
          <CardDescription>Make a direct payment via CCAvenue payment gateway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !ccavenueEnabled ? (
            <div className="flex items-center gap-3 p-4 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">Online payment is currently not available. Please try again later.</p>
            </div>
          ) : (
            <>
              {needsName && (
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerName"
                      placeholder="Enter your full name"
                      value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setNameError(""); }}
                      className="pl-9"
                      data-testid="input-customer-name"
                    />
                  </div>
                  {nameError && (
                    <p className="text-sm text-destructive" data-testid="text-name-error">{nameError}</p>
                  )}
                </div>
              )}
              {!needsName && isLoggedIn && userName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Paying as <span className="text-foreground font-medium">{userName}</span></span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (in Rupees)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9"
                    data-testid="input-payment-amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose (optional)</Label>
                <Input
                  id="purpose"
                  placeholder="e.g. Cylinder refill payment, Advance payment"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  data-testid="input-payment-purpose"
                />
              </div>

              {amountNum > 0 && (
                <div className="space-y-2 p-4 rounded-md bg-muted/10 border border-white/5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground" data-testid="text-base-amount">
                      {"\u20B9"}{amountNum.toFixed(2)}
                    </span>
                  </div>
                  {paymentSettings?.ccavenueFeeEnabled && feeAmount > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Convenience Fee ({feePercent}%)</span>
                      <span className="text-foreground" data-testid="text-fee-amount">
                        {"\u20B9"}{feeAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">Total Payable</span>
                    <span className="text-lg font-bold text-primary" data-testid="text-total-amount">
                      {"\u20B9"}{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200" data-testid="text-convenience-notice">
                <AlertCircle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                {feePercent}% convenience charges extra for CCAvenue online payment
              </div>

              <Button
                onClick={handlePay}
                disabled={payMutation.isPending || amountNum < 1}
                className="w-full"
                data-testid="button-pay-now"
              >
                {payMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {payMutation.isPending ? "Processing..." : isLoggedIn ? "Pay Now" : "Login to Pay"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Secured by CCAvenue Payment Gateway</span>
      </div>

      <div ref={paymentContainerRef} className="hidden" />
    </div>
  );
}

export function DirectPaymentCustomer() {
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const initialAmount = params.get("amount") || undefined;
  const initialPurpose = params.get("purpose") || undefined;

  return (
    <DashboardLayout role="customer">
      <div className="p-4 sm:p-6">
        <PaymentForm isLoggedIn={true} initialAmount={initialAmount} initialPurpose={initialPurpose} userName={user?.name} />
      </div>
    </DashboardLayout>
  );
}

export function DirectPaymentPublic() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) {
      const currentParams = new URLSearchParams(window.location.search);
      const redirectUrl = currentParams.toString()
        ? `/account/make-a-payment?${currentParams.toString()}`
        : "/account/make-a-payment";
      navigate(redirectUrl);
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="public-pay-page">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 py-20">
        <PaymentForm isLoggedIn={!!user} userName={user?.name} />
      </div>
    </div>
  );
}

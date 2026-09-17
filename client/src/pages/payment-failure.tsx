import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import type { PaymentTransaction } from "@shared/schema";

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

export default function PaymentFailurePage() {
  const [txnId, setTxnId] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTxnId(params.get("txnId"));
    setErrorReason(params.get("reason") || params.get("error") || "Payment could not be completed");
  }, []);

  const { data: txn, isLoading } = useQuery<PaymentTransaction>({
    queryKey: ["/api/payments/transaction", txnId],
    enabled: !!txnId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-testid="card-payment-failure">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto rounded-full bg-red-500/10 p-4 w-fit">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-failure-title">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground" data-testid="text-error-reason">
            {errorReason === "Aborted" ? "Payment was cancelled by user." :
             errorReason === "amount_mismatch" ? "Payment amount mismatch detected." :
             errorReason === "config" ? "Payment gateway is not configured." :
             `Reason: ${errorReason}`}
          </p>

          {txn && (
            <div className="space-y-3 text-sm border border-border rounded-md p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono" data-testid="text-txn-id">{txn.merchantTxnId}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Order #</span>
                <span data-testid="text-order-id">{txn.orderId}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono">{formatCurrency(txn.totalAmountPaise)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="destructive" data-testid="badge-status">FAILED</Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {txn?.orderId && (
              <Link href="/account/overview">
                <Button className="w-full" data-testid="button-retry">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

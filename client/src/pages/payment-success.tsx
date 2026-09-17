import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, IndianRupee, ArrowLeft, FileText } from "lucide-react";
import { Link } from "wouter";
import type { PaymentTransaction } from "@shared/schema";

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

export default function PaymentSuccessPage() {
  const [txnId, setTxnId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTxnId(params.get("txnId"));
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
      <Card className="w-full max-w-md" data-testid="card-payment-success">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto rounded-full bg-green-500/10 p-4 w-fit">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-success-title">Payment Successful</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {txn && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono" data-testid="text-txn-id">{txn.merchantTxnId}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Order #</span>
                <span data-testid="text-order-id">{txn.orderId}</span>
              </div>
              {txn.gatewayTrackingId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tracking ID</span>
                  <span className="font-mono" data-testid="text-tracking-id">{txn.gatewayTrackingId}</span>
                </div>
              )}
              {txn.bankRefNo && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Bank Ref</span>
                  <span className="font-mono" data-testid="text-bank-ref">{txn.bankRefNo}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Order Amount</span>
                  <span className="font-mono">{formatCurrency(txn.baseAmountPaise)}</span>
                </div>
                {txn.convenienceFeeAmountPaise && txn.convenienceFeeAmountPaise > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Convenience Fee</span>
                    <span className="font-mono text-primary">{formatCurrency(txn.convenienceFeeAmountPaise)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 font-medium text-base pt-1">
                  <span>Total Paid</span>
                  <span className="font-mono" data-testid="text-total-paid">{formatCurrency(txn.totalAmountPaise)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default" className="bg-green-500/15 text-green-400" data-testid="badge-status">PAID</Badge>
              </div>
            </div>
          )}

          {!txn && !isLoading && (
            <p className="text-center text-muted-foreground" data-testid="text-no-txn">
              Your payment was processed successfully.
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Link href="/account/overview">
              <Button className="w-full" data-testid="button-go-to-orders">
                <FileText className="h-4 w-4 mr-2" />
                View My Orders
              </Button>
            </Link>
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

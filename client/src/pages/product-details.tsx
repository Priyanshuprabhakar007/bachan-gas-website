import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, IndianRupee, ShoppingCart, Package, ShieldCheck, Truck, Clock, Flame, CheckCircle, ChevronLeft, ChevronRight, Loader2, CreditCard, Banknote } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Product, ProductImage, User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: !!id,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: galleryImages } = useQuery<ProductImage[]>({
    queryKey: ["/api/products", id, "images"],
    enabled: !!id,
  });

  const { data: paymentSettings, isLoading: paymentSettingsLoading } = useQuery<{ ccavenueEnabled: boolean }>({
    queryKey: ["/api/payment/settings"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const allImages: string[] = [
    product?.imageUrl,
    ...(galleryImages?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(g => g.imageUrl) || []),
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (bookingOpen && user) {
      if (!customerName) setCustomerName(user.name || "");
      if (!phone) setPhone(user.phone || "");
      if (!address) setAddress(user.address || "");
      if (!consumerNumber) setConsumerNumber(user.consumerId || "");
    }
  }, [bookingOpen, user]);

  useEffect(() => {
    if (!paymentSettings?.ccavenueEnabled && paymentMethod === "ONLINE") {
      setPaymentMethod("COD");
    }
  }, [paymentSettings?.ccavenueEnabled, paymentMethod]);

  const orderMutation = useMutation({
    mutationFn: async (data: { items: { productId: number; quantity: number; unitPrice: number }[]; customerName: string; deliveryAddress: string; phone: string; consumerNumber?: string; paymentMode: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: async (order: any) => {
      if (order?.user) {
        queryClient.setQueryData(["/api/user"], order.user);
      }
      const finalPhone = phone.trim() || order?.user?.phone || order?.phone;
      if (finalPhone) {
        localStorage.setItem("customer_phone", finalPhone);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      if (paymentMethod === "ONLINE" && order?.id) {
        try {
          const payRes = await apiRequest("POST", "/api/payments/ccavenue/initiate", { orderId: order.id });
          const payData = await payRes.json();
          if (payData.formHtml) {
            const container = document.createElement("div");
            container.innerHTML = payData.formHtml;
            document.body.appendChild(container);
            const form = document.getElementById("ccavenue_payment_form") as HTMLFormElement;
            if (form) form.submit();
            return;
          }
        } catch (err: any) {
          toast({ title: "Payment Error", description: err.message || "Could not initiate online payment. Your order has been saved. Please try paying from your orders page or contact support.", variant: "destructive" });
        }
      }

      setOrderSuccess(true);
    },
    onError: (error: any) => {
      let msg = error.message || "Failed to place booking";
      try {
        if (msg.includes("{")) {
          const parsed = JSON.parse(msg.substring(msg.indexOf("{")));
          if (parsed.message) msg = parsed.message;
        }
      } catch {}
      toast({ title: "Booking failed", description: msg, variant: "destructive" });
    },
  });

  function handleBook() {
    setBookingOpen(true);
  }

  function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const finalName = customerName.trim() || user?.name || "Customer";
    orderMutation.mutate({
      items: [{ productId: product.id, quantity, unitPrice: parseInt(product.price) }],
      customerName: finalName,
      deliveryAddress: address.trim(),
      phone: phone.trim(),
      consumerNumber: consumerNumber.trim() || undefined,
      paymentMode: paymentMethod === "ONLINE" ? "CCAVENUE" : "CASH",
      notes: notes.trim() || undefined,
    });
  }

  function handlePrevImage() {
    setSelectedImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  }

  function handleNextImage() {
    setSelectedImageIndex(prev => (prev + 1) % allImages.length);
  }

  const category = categories?.find(c => c.id === product?.categoryId);
  const isFormValid = address.trim().length > 0 && phone.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-lg" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-16 rounded" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
          <Link href="/products">
            <Button variant="outline" data-testid="button-back-products">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="product-details-page">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1 max-w-5xl">
        <Link href="/products">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-3" data-testid="product-gallery">
            {allImages.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted/20" data-testid="main-image-container">
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={product.name}
                    className="w-full aspect-[4/3] object-cover rounded-lg"
                    data-testid="img-main-preview"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-opacity hover:bg-black/70"
                        data-testid="button-prev-image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-opacity hover:bg-black/70"
                        data-testid="button-next-image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-2 flex-wrap" data-testid="thumbnail-strip">
                    {allImages.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`h-16 w-16 rounded overflow-hidden flex-shrink-0 ${
                          idx === selectedImageIndex ? "ring-2 ring-primary" : "ring-1 ring-white/10"
                        }`}
                        data-testid={`thumbnail-${idx}`}
                      >
                        <img
                          src={url}
                          alt={`${product.name} ${idx + 1}`}
                          className="object-cover w-full h-full cursor-pointer"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Card className="border-white/5 overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center rounded-lg" data-testid="placeholder-image">
                    <Package className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-category">
                    {category.icon} {category.name}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={product.inStock !== false ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}
                  data-testid="badge-stock"
                >
                  {product.inStock !== false ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-product-name">{product.name}</h1>
              {product.weight && (
                <p className="text-muted-foreground">Weight: {product.weight} {product.unit || "KG"}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <IndianRupee className="h-6 w-6 text-primary" />
              <span className="text-4xl font-bold text-foreground" data-testid="text-price">{product.price}</span>
              <span className="text-muted-foreground text-sm mt-2">per unit</span>
            </div>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed" data-testid="text-description">{product.description}</p>
            )}

            <Button
              size="lg"
              disabled={product.inStock === false}
              onClick={handleBook}
              className="w-full sm:w-auto"
              data-testid="button-book-now"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {product.inStock !== false ? "Book Now" : "Out of Stock"}
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {[
                { icon: ShieldCheck, label: "Quality Assured" },
                { icon: Truck, label: "Home Delivery" },
                { icon: Clock, label: "Same Day Service" },
              ].map(({ icon: Icon, label }, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={bookingOpen && !orderSuccess} onOpenChange={(open) => { if (!open) setBookingOpen(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-booking">
          <DialogHeader>
            <DialogTitle>Book {product.name}</DialogTitle>
            <DialogDescription>Fill in delivery details to place your order</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBooking} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
                <SelectTrigger data-testid="select-quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user ? (
              <div className="text-xs text-muted-foreground bg-white/5 p-2.5 rounded border border-white/10 flex items-center justify-between">
                <span>Ordering as: <strong className="text-foreground">{user.name || "Customer"}</strong></span>
                <span className="text-primary font-mono text-[11px]">{user.phone || user.username}</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-primary/10 p-2.5 rounded border border-primary/20">
                <span>Instant Booking: Enter your phone number below. We will keep you updated on your delivery.</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customer-name">Full Name</Label>
              <Input
                id="customer-name"
                placeholder="Enter your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumer-number">Consumer Number (optional)</Label>
              <Input
                id="consumer-number"
                placeholder="Enter your LPG consumer number"
                value={consumerNumber}
                onChange={(e) => setConsumerNumber(e.target.value)}
                data-testid="input-consumer-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address</Label>
              <Textarea
                id="address"
                placeholder="Enter your full delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any special instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
              />
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("COD")}
                  className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                    paymentMethod === "COD"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-white/10 text-muted-foreground"
                  }`}
                  data-testid="radio-cod"
                >
                  <Banknote className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">Pay when delivered</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (paymentSettings?.ccavenueEnabled) setPaymentMethod("ONLINE");
                  }}
                  disabled={paymentSettingsLoading || !paymentSettings?.ccavenueEnabled}
                  className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                    paymentSettingsLoading
                      ? "border-white/10 text-muted-foreground opacity-60"
                      : !paymentSettings?.ccavenueEnabled
                        ? "border-white/5 text-muted-foreground/40 cursor-not-allowed opacity-50"
                        : paymentMethod === "ONLINE"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-white/10 text-muted-foreground"
                  }`}
                  data-testid="radio-online"
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Pay Online</div>
                    <div className="text-xs text-muted-foreground">
                      {paymentSettingsLoading ? "Loading..." : paymentSettings?.ccavenueEnabled ? "CCAvenue gateway" : "Not available"}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <Card className="border-white/10">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <span className="text-xl font-bold" data-testid="text-total">
                      {(parseInt(product.price) * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
                {paymentMethod === "COD" && (
                  <p className="text-xs text-muted-foreground mt-2">Payment will be collected on delivery</p>
                )}
                {paymentMethod === "ONLINE" && (
                  <p className="text-xs text-muted-foreground mt-2">You will be redirected to CCAvenue for secure payment</p>
                )}
              </CardContent>
            </Card>
            <DialogFooter>
              <Button type="submit" disabled={orderMutation.isPending || !isFormValid} className="w-full" data-testid="button-confirm-booking">
                {orderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : paymentMethod === "ONLINE" ? (
                  "Place Order & Pay Online"
                ) : (
                  "Place Order (Cash on Delivery)"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={orderSuccess} onOpenChange={(open) => { if (!open) { setOrderSuccess(false); setBookingOpen(false); } }}>
        <DialogContent data-testid="dialog-success">
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Order Placed!</h2>
            <p className="text-muted-foreground">
              Your order for {quantity}x {product.name} has been placed successfully.
              {paymentMethod === "COD" && " Payment will be collected on delivery."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/account/overview">
                <Button data-testid="button-view-orders">View My Orders</Button>
              </Link>
              <Button variant="outline" onClick={() => { setOrderSuccess(false); setBookingOpen(false); }} data-testid="button-continue-shopping">
                Continue Shopping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="py-8 border-t border-white/10 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-bold text-white">Bachan Gas Agency</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Bachan Gas Agency. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { useState, useMemo, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  IndianRupee,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  Loader2,
  CheckCircle,
  X,
  Banknote,
  CreditCard,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Product } from "@shared/schema";

type SortOption = "newest" | "price-asc" | "price-desc";

interface CartItem {
  product: Product;
  qty: number;
}

export default function CustomerBookRefill() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [consumerNumber, setConsumerNumber] = useState(user?.consumerId || "");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("morning");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name || "");
      if (!phone) setPhone(user.phone || "");
      if (!address) setAddress(user.address || "");
      if (!consumerNumber) setConsumerNumber(user.consumerId || "");
    }
  }, [user]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProducts, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: paymentSettings, isLoading: paymentSettingsLoading } = useQuery<{ ccavenueEnabled: boolean }>({
    queryKey: ["/api/payment/settings"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: ccavenueConfig, isLoading: ccavenueConfigLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/payments/ccavenue/config"],
  });
  
  const isCcavenueReady = paymentSettings?.ccavenueEnabled && ccavenueConfig?.configured;

  useEffect(() => {
    if (!isCcavenueReady && paymentMethod === "ONLINE") {
      setPaymentMethod("COD");
    }
  }, [isCcavenueReady, paymentMethod]);

  const products = useMemo(() => {
    let filtered =
      allProducts?.filter((p) => {
        const matchesCategory =
          activeCategory === "all" ||
          p.categoryId === Number(activeCategory);
        const matchesSearch =
          !searchQuery ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const isActive = p.isActive !== false && p.status === "ACTIVE";
        return matchesCategory && matchesSearch && isActive;
      }) || [];
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseInt(a.price) - parseInt(b.price);
        case "price-desc":
          return parseInt(b.price) - parseInt(a.price);
        case "newest":
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });
  }, [allProducts, activeCategory, searchQuery, sortBy]);

  const updateQty = useCallback((product: Product, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      const newQty = (existing?.qty || 0) + delta;
      if (newQty <= 0) {
        next.delete(product.id);
      } else {
        next.set(product.id, { product, qty: Math.min(newQty, 99) });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const cartItems = Array.from(cart.values());
  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseInt(item.product.price) * item.qty,
    0
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
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
          toast({
            title: "Payment Error",
            description: err.message || "Could not initiate online payment. Your order has been saved. Please try paying from your orders page or contact support.",
            variant: "destructive",
          });
        }
      }

      setCart(new Map());
      setCheckoutOpen(false);
      toast({
        title: "Order placed successfully",
        description: paymentMethod === "COD"
          ? "Your order has been placed. Payment will be collected on delivery."
          : "Your order has been placed. You can track it in Order History.",
      });
      navigate("/account/history");
    },
    onError: (err: any) => {
      let msg = err.message || "Failed to place order";
      try {
        if (msg.includes("{")) {
          const parsed = JSON.parse(msg.substring(msg.indexOf("{")));
          if (parsed.message) msg = parsed.message;
        }
      } catch {}
      toast({
        title: "Order failed",
        description: msg,
        variant: "destructive",
      });
    },
  });

  function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const items = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.qty,
      unitPrice: parseInt(item.product.price),
    }));

    const finalName = customerName.trim() || user?.name || "Customer";

    orderMutation.mutate({
      items,
      customerName: finalName,
      phone: phone.trim(),
      deliveryAddress: address.trim(),
      consumerNumber: consumerNumber.trim() || undefined,
      totalAmount: String(subtotal),
      totalPaise: subtotal * 100,
      paymentMode: paymentMethod === "ONLINE" ? "CCAVENUE" : "CASH",
      preferredDate: preferredDate || undefined,
      preferredSlot: preferredSlot || undefined,
      notes: notes.trim() || undefined,
    });
  }

  function getQty(productId: number) {
    return cart.get(productId)?.qty || 0;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <DashboardLayout role="customer">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1
              className="text-3xl font-bold text-white mb-1"
              data-testid="text-page-title"
            >
              Browse Catalogue
            </h1>
            <p className="text-muted-foreground">
              Choose products and place your order.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select
              value={activeCategory}
              onValueChange={setActiveCategory}
            >
              <SelectTrigger
                className="w-full sm:w-[180px]"
                data-testid="select-category"
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger
                className="w-full sm:w-[180px]"
                data-testid="select-sort"
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-white/5">
                  <CardContent className="p-0">
                    <Skeleton className="aspect-[4/3] rounded-t-lg" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3
                className="text-lg font-medium text-foreground mb-2"
                data-testid="text-no-results"
              >
                No products found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => {
                const category = categories?.find(
                  (c) => c.id === product.categoryId
                );
                const qty = getQty(product.id);
                const outOfStock = product.inStock === false;

                return (
                  <Card
                    key={product.id}
                    className="border-white/5 overflow-visible"
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-4"
                          data-testid={`img-product-${product.id}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3
                          className="font-semibold text-foreground text-sm"
                          data-testid={`text-name-${product.id}`}
                        >
                          {product.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={
                            outOfStock
                              ? "bg-red-500/15 text-red-400"
                              : "bg-green-500/15 text-green-400"
                          }
                        >
                          {outOfStock ? "Out of Stock" : "In Stock"}
                        </Badge>
                      </div>

                      {category && (
                        <Badge variant="secondary" className="text-xs">
                          {category.icon} {category.name}
                        </Badge>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-primary" />
                          <span
                            className="text-lg font-bold text-foreground"
                            data-testid={`text-price-${product.id}`}
                          >
                            {product.price}
                          </span>
                        </div>
                      </div>

                      {outOfStock ? (
                        <Button
                          disabled
                          className="w-full"
                          variant="secondary"
                          data-testid={`button-oos-${product.id}`}
                        >
                          Out of Stock
                        </Button>
                      ) : qty === 0 ? (
                        <Button
                          className="w-full"
                          onClick={() => updateQty(product, 1)}
                          data-testid={`button-add-${product.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQty(product, -1)}
                            data-testid={`button-minus-${product.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span
                            className="w-10 text-center text-lg font-bold text-foreground"
                            data-testid={`text-qty-${product.id}`}
                          >
                            {qty}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQty(product, 1)}
                            data-testid={`button-plus-${product.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-4">
            <CartPanel
              items={cartItems}
              subtotal={subtotal}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
              onCheckout={() => setCheckoutOpen(true)}
            />
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/95 backdrop-blur border-t border-white/10">
          <Button
            className="w-full relative"
            disabled={cartItems.length === 0}
            onClick={() => setMobileCartOpen(true)}
            data-testid="button-view-cart-mobile"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
            {cartCount > 0 && (
              <Badge className="ml-2 bg-white/20 text-white">
                {cartCount} items - {"\u20B9"}
                {subtotal.toLocaleString()}
              </Badge>
            )}
          </Button>
        </div>

        <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
          <DialogContent className="sm:max-w-md" data-testid="dialog-mobile-cart">
            <DialogHeader>
              <DialogTitle>Your Cart</DialogTitle>
              <DialogDescription>Review items before checkout</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <CartPanel
                items={cartItems}
                subtotal={subtotal}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
                onCheckout={() => {
                  setMobileCartOpen(false);
                  setCheckoutOpen(true);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Review your order and provide delivery details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm p-2 rounded bg-muted/10"
                >
                  <span className="text-foreground font-medium">
                    {item.product.name} x{item.qty}
                  </span>
                  <span className="text-muted-foreground">
                    {"\u20B9"}
                    {(parseInt(item.product.price) * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded bg-primary/10 border border-primary/20">
              <span className="font-medium text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">
                {"\u20B9"}
                {subtotal.toLocaleString()}
              </span>
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
                placeholder="Your phone number"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Preferred Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot">Time Slot</Label>
                <Select value={preferredSlot} onValueChange={setPreferredSlot}>
                  <SelectTrigger data-testid="select-slot">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  disabled={paymentSettingsLoading || ccavenueConfigLoading || !isCcavenueReady}
                  className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                    paymentSettingsLoading || ccavenueConfigLoading
                      ? "border-white/10 text-muted-foreground opacity-60"
                      : !isCcavenueReady
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
                      {paymentSettingsLoading || ccavenueConfigLoading ? "Loading..." : isCcavenueReady ? "CCAvenue gateway" : "Not available"}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 sticky bottom-0 bg-background pb-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckoutOpen(false)}
                data-testid="button-cancel-checkout"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  orderMutation.isPending ||
                  cartItems.length === 0 ||
                  !address ||
                  !phone
                }
                data-testid="button-place-order"
              >
                {orderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : paymentMethod === "ONLINE" ? (
                  <CreditCard className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {orderMutation.isPending
                  ? "Placing Order..."
                  : paymentMethod === "ONLINE"
                    ? "Place Order & Pay Online"
                    : "Place Order (Cash on Delivery)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function CartPanel({
  items,
  subtotal,
  onUpdateQty,
  onRemove,
  onCheckout,
}: {
  items: CartItem[];
  subtotal: number;
  onUpdateQty: (product: Product, delta: number) => void;
  onRemove: (productId: number) => void;
  onCheckout: () => void;
}) {
  return (
    <Card className="border-white/10" data-testid="cart-panel">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            Cart ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-6">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Your cart is empty
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add products to get started
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-3 p-2 rounded bg-muted/10"
                  data-testid={`cart-item-${item.product.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {"\u20B9"}
                      {item.product.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onUpdateQty(item.product, -1)}
                      data-testid={`button-cart-minus-${item.product.id}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium text-foreground" data-testid={`text-cart-qty-${item.product.id}`}>
                      {item.qty}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onUpdateQty(item.product, 1)}
                      data-testid={`button-cart-plus-${item.product.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-400"
                      onClick={() => onRemove(item.product.id)}
                      data-testid={`button-cart-remove-${item.product.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">
                    {"\u20B9"}
                    {(parseInt(item.product.price) * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  {"\u20B9"}
                  {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-green-400">Free</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-primary">
                  {"\u20B9"}
                  {subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={onCheckout}
              data-testid="button-proceed-checkout"
            >
              Proceed to Checkout
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

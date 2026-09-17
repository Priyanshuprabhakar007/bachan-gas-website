import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Square,
  MapPin,
  CreditCard,
  Plus,
  RotateCcw,
  ShieldCheck,
  Loader2,
  Send,
  Navigation,
  CircleDot,
} from "lucide-react";
import type {
  Vehicle,
  Product,
  PickupRequest,
  Trip,
  TripStop,
  TripInventoryIssuedRow,
  TripStopDelivery,
  TripStopPayment,
  TripReturnRequest,
  TripReturnItem,
  Order,
} from "@shared/schema";

const PICKUP_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const TRIP_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  CLOSED: "default",
  CANCELLED: "destructive",
};

const STOP_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ARRIVED: "outline",
  DELIVERED: "default",
  FAILED: "destructive",
  SKIPPED: "secondary",
};

interface PickupRequestWithItems extends PickupRequest {
  items?: Array<{ id: number; productId: number; qtyRequested: number; qtyApproved: number }>;
  vehicle?: Vehicle;
}

interface TripStopWithDetails extends TripStop {
  deliveries: TripStopDelivery[];
  payments: TripStopPayment[];
  order?: Order;
}

interface TripDetail {
  trip: Trip & { vehicle?: Vehicle };
  inventoryIssued: TripInventoryIssuedRow[];
  stops: TripStopWithDetails[];
  returnRequest: { request: TripReturnRequest; items: TripReturnItem[] } | null;
}

function GodownPickupTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: pickupRequests, isLoading: requestsLoading } = useQuery<PickupRequestWithItems[]>({
    queryKey: ["/api/delivery/pickup-requests"],
  });

  const createPickupMutation = useMutation({
    mutationFn: async (data: { vehicleId: number; items: { productId: number; qtyRequested: number }[] }) => {
      await apiRequest("POST", "/api/delivery/pickup-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/pickup-requests"] });
      toast({ title: "Request Sent", description: "Pickup request has been submitted." });
      setSelectedVehicleId("");
      setQuantities({});
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const availableProducts = (products || []).filter((p) => (p.stockQty ?? 0) > 0);

  const handleSubmitPickup = () => {
    if (!selectedVehicleId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a vehicle." });
      return;
    }
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qtyRequested]) => ({ productId: Number(productId), qtyRequested }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Add at least one product." });
      return;
    }
    createPickupMutation.mutate({ vehicleId: Number(selectedVehicleId), items });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Create Pickup Request
          </CardTitle>
          <CardDescription>Request products from the godown for delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle-select">Vehicle</Label>
            {vehiclesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger data-testid="select-vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles || []).filter((v) => v.isActive).map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.number} - {v.ownerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            {productsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : availableProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products available.</p>
            ) : (
              <div className="space-y-3">
                {availableProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1 min-w-0 truncate" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                      <span className="text-muted-foreground ml-1">(stock: {product.stockQty})</span>
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={product.stockQty ?? 0}
                      value={quantities[product.id] || ""}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [product.id]: Number(e.target.value) }))
                      }
                      className="w-24"
                      placeholder="Qty"
                      data-testid={`input-qty-${product.id}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmitPickup}
            disabled={createPickupMutation.isPending}
            data-testid="button-send-pickup-request"
          >
            {createPickupMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Request
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Past Pickup Requests</h3>
        {requestsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            ))}
          </div>
        ) : !pickupRequests || pickupRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-pickup-requests">
                No pickup requests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          pickupRequests.map((req) => (
            <Card key={req.id} data-testid={`card-pickup-request-${req.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-sm font-medium" data-testid={`text-pickup-id-${req.id}`}>
                      Request #{req.id}
                    </p>
                    {req.vehicle && (
                      <p className="text-sm text-muted-foreground">
                        Vehicle: {req.vehicle.number}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : ""}
                    </p>
                    {req.items && req.items.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {req.items.map((item) => (
                          <span key={item.id} className="mr-3">
                            Product #{item.productId}: {item.qtyRequested} requested
                            {item.qtyApproved > 0 && `, ${item.qtyApproved} approved`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={PICKUP_STATUS_VARIANT[req.status] || "secondary"}
                    data-testid={`badge-pickup-status-${req.id}`}
                  >
                    {req.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function TripCard({ trip, products }: { trip: Trip & { vehicle?: Vehicle }; products: Product[] }) {
  const { toast } = useToast();
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);

  const { data: tripDetail, isLoading: detailLoading } = useQuery<TripDetail>({
    queryKey: ["/api/trips", trip.id],
    enabled: expandedTripId === trip.id || trip.status === "ACTIVE" || trip.status === "COMPLETED",
  });

  const startTripMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/delivery/trip/${trip.id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", trip.id] });
      toast({ title: "Trip Started", description: "Your trip is now active." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const endTripMutation = useMutation({
    mutationFn: async () => {
      const summary = {
        stopsCount: tripDetail?.stops.length || 0,
        deliveredCount: tripDetail?.stops.filter((s) => s.status === "DELIVERED").length || 0,
        endedAt: new Date().toISOString(),
      };
      await apiRequest("POST", `/api/delivery/trip/${trip.id}/end`, summary);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", trip.id] });
      toast({ title: "Trip Ended", description: "Trip has been completed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const isExpanded = trip.status === "ACTIVE" || trip.status === "COMPLETED" || expandedTripId === trip.id;

  return (
    <Card data-testid={`card-trip-${trip.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base" data-testid={`text-trip-id-${trip.id}`}>
              Trip #{trip.id}
            </CardTitle>
            <CardDescription>
              {trip.vehicle ? `Vehicle: ${trip.vehicle.number}` : `Vehicle ID: ${trip.vehicleId}`}
              {trip.startTime && ` | Started: ${new Date(trip.startTime).toLocaleString()}`}
            </CardDescription>
          </div>
          <Badge
            variant={TRIP_STATUS_VARIANT[trip.status] || "secondary"}
            data-testid={`badge-trip-status-${trip.id}`}
          >
            {trip.status === "CLOSED" && <ShieldCheck className="h-3 w-3 mr-1" />}
            {trip.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trip.status === "DRAFT" && (
          <Button
            onClick={() => startTripMutation.mutate()}
            disabled={startTripMutation.isPending}
            data-testid={`button-start-trip-${trip.id}`}
          >
            {startTripMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Trip
          </Button>
        )}

        {trip.status === "CLOSED" && tripDetail?.returnRequest && (
          <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500" data-testid={`text-verified-${trip.id}`}>
                Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Return verified on {tripDetail.returnRequest.request.verifiedAt
                ? new Date(tripDetail.returnRequest.request.verifiedAt).toLocaleString()
                : "N/A"}
            </p>
          </div>
        )}

        {!isExpanded && trip.status !== "DRAFT" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedTripId(trip.id)}
            data-testid={`button-expand-trip-${trip.id}`}
          >
            View Details
          </Button>
        )}

        {isExpanded && detailLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {isExpanded && tripDetail && trip.status === "ACTIVE" && (
          <ActiveTripSection tripDetail={tripDetail} products={products} />
        )}

        {isExpanded && tripDetail && trip.status === "ACTIVE" && (
          <Button
            variant="destructive"
            onClick={() => endTripMutation.mutate()}
            disabled={endTripMutation.isPending}
            data-testid={`button-end-trip-${trip.id}`}
          >
            {endTripMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            End Trip
          </Button>
        )}

        {isExpanded && tripDetail && trip.status === "COMPLETED" && (
          <ReturnToGodownSection tripDetail={tripDetail} products={products} />
        )}
      </CardContent>
    </Card>
  );
}

function ActiveTripSection({ tripDetail, products }: { tripDetail: TripDetail; products: Product[] }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const { data: assignedOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders/delivery", user?.id],
    enabled: !!user?.id,
  });

  const addStopMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/delivery/trip/${tripDetail.trip.id}/stops`, { orderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripDetail.trip.id] });
      toast({ title: "Stop Added", description: "New stop has been added to the trip." });
      setSelectedOrderId("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const existingOrderIds = new Set(tripDetail.stops.map((s) => s.orderId));
  const availableOrders = (assignedOrders || []).filter((o) => !existingOrderIds.has(o.id));

  return (
    <div className="space-y-4">
      {tripDetail.inventoryIssued.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Inventory Issued:</p>
          <div className="flex flex-wrap gap-2">
            {tripDetail.inventoryIssued.map((inv) => {
              const product = products.find((p) => p.id === inv.productId);
              return (
                <Badge key={inv.id} variant="outline" data-testid={`badge-issued-${inv.id}`}>
                  {product?.name || `Product #${inv.productId}`}: {inv.qtyIssued}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Add Stop</p>
        <div className="flex items-center gap-2">
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger className="flex-1" data-testid="select-order-for-stop">
              <SelectValue placeholder="Select an order" />
            </SelectTrigger>
            <SelectContent>
              {availableOrders.map((order) => (
                <SelectItem key={order.id} value={String(order.id)}>
                  {order.orderNumber} - {order.customerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => {
              if (selectedOrderId) addStopMutation.mutate(Number(selectedOrderId));
            }}
            disabled={!selectedOrderId || addStopMutation.isPending}
            data-testid="button-add-stop"
          >
            {addStopMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {tripDetail.stops.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Stops ({tripDetail.stops.length})</p>
          {tripDetail.stops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              tripId={tripDetail.trip.id}
              products={products}
              inventoryIssued={tripDetail.inventoryIssued}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StopCard({
  stop,
  tripId,
  products,
  inventoryIssued,
}: {
  stop: TripStopWithDetails;
  tripId: number;
  products: Product[];
  inventoryIssued: TripInventoryIssuedRow[];
}) {
  const { toast } = useToast();
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<number, { delivered: number; empties: number }>>({});
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  const updateStopMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/delivery/trip/stop/${stop.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({ title: "Stop Updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: async (data: { productId: number; qtyDelivered: number; qtyEmptiesReturned: number }[]) => {
      for (const item of data) {
        await apiRequest("POST", `/api/delivery/trip/stop/${stop.id}/delivery`, item);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({ title: "Delivery Recorded" });
      setShowDeliveryForm(false);
      setDeliveryQtys({});
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { method: string; amount: string; referenceNo?: string }) => {
      await apiRequest("POST", `/api/delivery/trip/stop/${stop.id}/payment`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      toast({ title: "Payment Recorded" });
      setShowPaymentForm(false);
      setPaymentAmount("");
      setPaymentRef("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleDeliverySubmit = () => {
    const items = Object.entries(deliveryQtys)
      .filter(([, val]) => val.delivered > 0 || val.empties > 0)
      .map(([productId, val]) => ({
        productId: Number(productId),
        qtyDelivered: val.delivered,
        qtyEmptiesReturned: val.empties,
      }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Enter delivery quantities." });
      return;
    }
    deliveryMutation.mutate(items);
  };

  const handlePaymentSubmit = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast({ variant: "destructive", title: "Error", description: "Enter a valid amount." });
      return;
    }
    paymentMutation.mutate({
      method: paymentMethod,
      amount: paymentAmount,
      referenceNo: paymentRef || undefined,
    });
  };

  return (
    <Card data-testid={`card-stop-${stop.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-medium" data-testid={`text-stop-id-${stop.id}`}>
              Stop #{stop.sequence ?? stop.id}
              {stop.order && (
                <span className="text-muted-foreground ml-2">
                  {stop.order.orderNumber} - {stop.order.customerName}
                </span>
              )}
            </p>
            {stop.orderId && !stop.order && (
              <p className="text-xs text-muted-foreground">Order #{stop.orderId}</p>
            )}
          </div>
          <Badge
            variant={STOP_STATUS_VARIANT[stop.status] || "secondary"}
            data-testid={`badge-stop-status-${stop.id}`}
          >
            {stop.status}
          </Badge>
        </div>

        {stop.deliveries && stop.deliveries.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {stop.deliveries.map((d) => {
              const product = products.find((p) => p.id === d.productId);
              return (
                <p key={d.id}>
                  {product?.name || `Product #${d.productId}`}: {d.qtyDelivered} delivered, {d.qtyEmptiesReturned} empties
                </p>
              );
            })}
          </div>
        )}

        {stop.payments && stop.payments.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            {stop.payments.map((p) => (
              <p key={p.id}>
                <CreditCard className="h-3 w-3 inline mr-1" />
                {p.method}: {p.amount} {p.referenceNo && `(Ref: ${p.referenceNo})`}
              </p>
            ))}
          </div>
        )}

        {stop.status === "PENDING" && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStopMutation.mutate("ARRIVED")}
              disabled={updateStopMutation.isPending}
              data-testid={`button-arrived-${stop.id}`}
            >
              <Navigation className="h-4 w-4 mr-1" />
              Arrived
            </Button>
          </div>
        )}

        {stop.status === "ARRIVED" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {!showDeliveryForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeliveryForm(true)}
                  data-testid={`button-show-delivery-form-${stop.id}`}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Record Delivery
                </Button>
              )}
              {!showPaymentForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentForm(true)}
                  data-testid={`button-show-payment-form-${stop.id}`}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => updateStopMutation.mutate("DELIVERED")}
                disabled={updateStopMutation.isPending}
                data-testid={`button-mark-delivered-${stop.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Delivered
              </Button>
            </div>

            {showDeliveryForm && (
              <div className="space-y-2 p-3 rounded-md border border-border">
                <p className="text-sm font-medium">Delivery Details</p>
                {inventoryIssued.map((inv) => {
                  const product = products.find((p) => p.id === inv.productId);
                  return (
                    <div key={inv.productId} className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm flex-1 min-w-0 truncate">
                        {product?.name || `Product #${inv.productId}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Delivered"
                          className="w-20"
                          value={deliveryQtys[inv.productId]?.delivered ?? ""}
                          onChange={(e) =>
                            setDeliveryQtys((prev) => ({
                              ...prev,
                              [inv.productId]: {
                                delivered: Number(e.target.value),
                                empties: prev[inv.productId]?.empties || 0,
                              },
                            }))
                          }
                          data-testid={`input-delivery-qty-${stop.id}-${inv.productId}`}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Empties"
                          className="w-20"
                          value={deliveryQtys[inv.productId]?.empties ?? ""}
                          onChange={(e) =>
                            setDeliveryQtys((prev) => ({
                              ...prev,
                              [inv.productId]: {
                                delivered: prev[inv.productId]?.delivered || 0,
                                empties: Number(e.target.value),
                              },
                            }))
                          }
                          data-testid={`input-empties-qty-${stop.id}-${inv.productId}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleDeliverySubmit}
                    disabled={deliveryMutation.isPending}
                    data-testid={`button-submit-delivery-${stop.id}`}
                  >
                    {deliveryMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Save Delivery
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDeliveryForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showPaymentForm && (
              <div className="space-y-2 p-3 rounded-md border border-border">
                <p className="text-sm font-medium">Payment Details</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-28" data-testid={`select-payment-method-${stop.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Amount"
                    className="w-28"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    data-testid={`input-payment-amount-${stop.id}`}
                  />
                  <Input
                    placeholder="Reference"
                    className="w-32"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    data-testid={`input-payment-ref-${stop.id}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handlePaymentSubmit}
                    disabled={paymentMutation.isPending}
                    data-testid={`button-submit-payment-${stop.id}`}
                  >
                    {paymentMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Save Payment
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPaymentForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReturnToGodownSection({ tripDetail, products }: { tripDetail: TripDetail; products: Product[] }) {
  const { toast } = useToast();
  const [returnItems, setReturnItems] = useState<
    Record<number, { full: number; empty: number; damaged: number }>
  >(() => {
    const initial: Record<number, { full: number; empty: number; damaged: number }> = {};
    for (const inv of tripDetail.inventoryIssued) {
      const totalDelivered = tripDetail.stops.reduce((sum, stop) => {
        return (
          sum +
          (stop.deliveries || [])
            .filter((d) => d.productId === inv.productId)
            .reduce((s, d) => s + (d.qtyDelivered || 0), 0)
        );
      }, 0);
      const remaining = inv.qtyIssued - totalDelivered;
      initial[inv.productId] = { full: Math.max(remaining, 0), empty: 0, damaged: 0 };
    }
    return initial;
  });
  const [deliveryManNote, setDeliveryManNote] = useState("");

  const returnMutation = useMutation({
    mutationFn: async (data: {
      items: { productId: number; qtyFullReturned: number; qtyEmptyReturned: number; qtyDamaged: number }[];
      deliveryManNote: string;
    }) => {
      await apiRequest("POST", `/api/delivery/trip/${tripDetail.trip.id}/return`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripDetail.trip.id] });
      toast({ title: "Return Submitted", description: "Return to godown has been submitted for verification." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  if (tripDetail.returnRequest) {
    return (
      <div className="p-3 rounded-md bg-muted/50 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Return Request Submitted
        </p>
        <Badge variant={tripDetail.returnRequest.request.status === "VERIFIED" ? "default" : "secondary"}>
          {tripDetail.returnRequest.request.status}
        </Badge>
        {tripDetail.returnRequest.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return (
            <p key={item.id} className="text-xs text-muted-foreground">
              {product?.name || `Product #${item.productId}`}: {item.qtyFullReturned} full,{" "}
              {item.qtyEmptyReturned} empty, {item.qtyDamaged} damaged
            </p>
          );
        })}
      </div>
    );
  }

  const handleSubmitReturn = () => {
    const items = Object.entries(returnItems).map(([productId, vals]) => ({
      productId: Number(productId),
      qtyFullReturned: vals.full,
      qtyEmptyReturned: vals.empty,
      qtyDamaged: vals.damaged,
    }));
    returnMutation.mutate({ items, deliveryManNote });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-semibold">Return to Godown</h4>
      </div>

      <div className="space-y-3">
        {tripDetail.inventoryIssued.map((inv) => {
          const product = products.find((p) => p.id === inv.productId);
          const vals = returnItems[inv.productId] || { full: 0, empty: 0, damaged: 0 };
          return (
            <div key={inv.productId} className="space-y-1">
              <p className="text-sm font-medium">
                {product?.name || `Product #${inv.productId}`}
                <span className="text-muted-foreground ml-2">(Issued: {inv.qtyIssued})</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Full</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={vals.full}
                    onChange={(e) =>
                      setReturnItems((prev) => ({
                        ...prev,
                        [inv.productId]: { ...prev[inv.productId], full: Number(e.target.value) },
                      }))
                    }
                    data-testid={`input-return-full-${inv.productId}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Empty</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={vals.empty}
                    onChange={(e) =>
                      setReturnItems((prev) => ({
                        ...prev,
                        [inv.productId]: { ...prev[inv.productId], empty: Number(e.target.value) },
                      }))
                    }
                    data-testid={`input-return-empty-${inv.productId}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Damaged</Label>
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={vals.damaged}
                    onChange={(e) =>
                      setReturnItems((prev) => ({
                        ...prev,
                        [inv.productId]: { ...prev[inv.productId], damaged: Number(e.target.value) },
                      }))
                    }
                    data-testid={`input-return-damaged-${inv.productId}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label>Note</Label>
        <Textarea
          value={deliveryManNote}
          onChange={(e) => setDeliveryManNote(e.target.value)}
          placeholder="Any notes about the return..."
          data-testid="textarea-return-note"
        />
      </div>

      <Button
        onClick={handleSubmitReturn}
        disabled={returnMutation.isPending}
        data-testid="button-submit-return"
      >
        {returnMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4 mr-2" />
        )}
        Submit Return
      </Button>
    </div>
  );
}

function MyTripsTab() {
  const { data: trips, isLoading } = useQuery<(Trip & { vehicle?: Vehicle })[]>({
    queryKey: ["/api/delivery/trips"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-trips">
            No trips found.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedTrips = [...trips].sort((a, b) => {
    const order: Record<string, number> = { ACTIVE: 0, DRAFT: 1, COMPLETED: 2, CLOSED: 3, CANCELLED: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  return (
    <div className="space-y-4">
      {sortedTrips.map((trip) => (
        <TripCard key={trip.id} trip={trip} products={products || []} />
      ))}
    </div>
  );
}

export default function DeliveryDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold" data-testid="text-delivery-dashboard-title">
          Delivery Dashboard
        </h1>

        <Tabs defaultValue="pickup" className="w-full">
          <TabsList data-testid="tabs-delivery-nav">
            <TabsTrigger value="pickup" data-testid="tab-godown-pickup">
              <Package className="h-4 w-4 mr-2" />
              Godown Pickup
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-my-trips">
              <Truck className="h-4 w-4 mr-2" />
              My Trips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup">
            <GodownPickupTab />
          </TabsContent>

          <TabsContent value="trips">
            <MyTripsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

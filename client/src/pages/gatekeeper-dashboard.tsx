import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Activity,
  Package,
  Plus,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Truck,
  Shield,
} from "lucide-react";
import type {
  StockMovement,
  Product,
  Inventory,
  PickupRequest,
  PickupRequestItem,
  TripReturnRequest,
  TripReturnItem,
  Vehicle,
} from "@shared/schema";

type StaffMember = { id: number; name: string; role: string; phone: string | null };

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
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
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    </div>
  );
}

function PickupRequestCard({
  request,
  products,
  staff,
  vehicles,
}: {
  request: PickupRequest;
  products: Product[];
  staff: StaffMember[];
  vehicles: Vehicle[];
}) {
  const { toast } = useToast();
  const [vehicleChecked, setVehicleChecked] = useState(false);
  const [safetyOk, setSafetyOk] = useState(false);
  const [note, setNote] = useState("");
  const [approvedQtys, setApprovedQtys] = useState<Record<number, number>>({});

  const { data: requestItems, isLoading: itemsLoading } = useQuery<PickupRequestItem[]>({
    queryKey: ["/api/gatekeeper/pickup-requests", request.id, "items"],
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const itemsToSend = (requestItems || [])
        .map((item) => ({
          productId: item.productId,
          qtyApproved: approvedQtys[item.productId] ?? item.qtyRequested,
        }))
        .filter((item) => item.qtyApproved > 0);

      if (itemsToSend.length === 0) {
        throw new Error("At least one item must have an approved quantity greater than zero.");
      }

      await apiRequest("POST", `/api/gatekeeper/pickup-requests/${request.id}/approve`, {
        items: itemsToSend,
        vehicleChecked,
        safetyOk,
        note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=PENDING"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=APPROVED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=REJECTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests", request.id, "items"] });
      toast({ title: "Approved", description: "Pickup request approved successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/gatekeeper/pickup-requests/${request.id}/reject`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=PENDING"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=APPROVED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests?status=REJECTED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/pickup-requests", request.id, "items"] });
      toast({ title: "Rejected", description: "Pickup request rejected." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const deliveryMan = staff.find((s) => s.id === request.deliveryManId);
  const vehicle = vehicles.find((v) => v.id === request.vehicleId);
  const isPending = request.status === "PENDING";

  return (
    <Card data-testid={`card-pickup-request-${request.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Request #{request.id}
          </CardTitle>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p data-testid={`text-delivery-man-${request.id}`}>
              Delivery Man: {deliveryMan?.name || `ID ${request.deliveryManId}`}
            </p>
            <p data-testid={`text-vehicle-${request.id}`}>
              Vehicle: {vehicle ? `${vehicle.number} (${vehicle.type || "N/A"})` : `ID ${request.vehicleId}`}
            </p>
            <p>Created: {request.createdAt ? new Date(request.createdAt).toLocaleString() : "N/A"}</p>
          </div>
        </div>
        <Badge
          variant={isPending ? "secondary" : request.status === "APPROVED" ? "default" : "destructive"}
          className="no-default-hover-elevate"
          data-testid={`badge-status-${request.id}`}
        >
          {request.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : requestItems && requestItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Requested</TableHead>
                {isPending && <TableHead className="text-right">Qty Approved</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <TableRow key={item.id} data-testid={`row-pickup-item-${item.id}`}>
                    <TableCell className="font-medium">
                      {product?.name || `Product #${item.productId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="no-default-hover-elevate">
                        {item.qtyRequested}
                      </Badge>
                    </TableCell>
                    {isPending && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 ml-auto"
                          value={approvedQtys[item.productId] ?? item.qtyRequested}
                          onChange={(e) =>
                            setApprovedQtys((prev) => ({
                              ...prev,
                              [item.productId]: parseInt(e.target.value) || 0,
                            }))
                          }
                          data-testid={`input-qty-approved-${item.productId}-${request.id}`}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No items found for this request.</p>
        )}

        {isPending && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={vehicleChecked}
                  onCheckedChange={(v) => setVehicleChecked(v === true)}
                  data-testid={`checkbox-vehicle-checked-${request.id}`}
                />
                <Shield className="h-4 w-4 text-muted-foreground" />
                Vehicle Checked
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={safetyOk}
                  onCheckedChange={(v) => setSafetyOk(v === true)}
                  data-testid={`checkbox-safety-ok-${request.id}`}
                />
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                Safety OK
              </label>
            </div>

            <Textarea
              placeholder="Gatekeeper note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              data-testid={`textarea-gk-note-${request.id}`}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                data-testid={`button-approve-${request.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                data-testid={`button-reject-${request.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {!isPending && request.gatekeeperNote && (
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Note: {request.gatekeeperNote}
            </p>
            {request.decidedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Decided: {new Date(request.decidedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReturnVerificationCard({
  returnRequest,
  products,
  staff,
}: {
  returnRequest: TripReturnRequest;
  products: Product[];
  staff: StaffMember[];
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [verifiedQtys, setVerifiedQtys] = useState<
    Record<number, { qtyFullReturned: number; qtyEmptyReturned: number; qtyDamaged: number }>
  >({});

  const { data: returnItems, isLoading: itemsLoading } = useQuery<TripReturnItem[]>({
    queryKey: ["/api/gatekeeper/returns", returnRequest.id, "items"],
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const itemsToSend = (returnItems || []).map((item) => {
        const overrides = verifiedQtys[item.productId];
        return {
          productId: item.productId,
          qtyFullReturned: overrides?.qtyFullReturned ?? (item.qtyFullReturned || 0),
          qtyEmptyReturned: overrides?.qtyEmptyReturned ?? (item.qtyEmptyReturned || 0),
          qtyDamaged: overrides?.qtyDamaged ?? (item.qtyDamaged || 0),
        };
      });

      await apiRequest("POST", `/api/gatekeeper/returns/${returnRequest.id}/verify`, {
        items: itemsToSend,
        note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/returns?status=PENDING_VERIFY"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/returns?status=VERIFIED"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gatekeeper/returns", returnRequest.id, "items"] });
      toast({ title: "Verified", description: "Return verified successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const deliveryMan = staff.find((s) => s.id === returnRequest.submittedByDeliveryManId);
  const isPending = returnRequest.status === "PENDING_VERIFY";

  const updateVerifiedQty = (
    productId: number,
    field: "qtyFullReturned" | "qtyEmptyReturned" | "qtyDamaged",
    value: number,
    item: TripReturnItem
  ) => {
    setVerifiedQtys((prev) => ({
      ...prev,
      [productId]: {
        qtyFullReturned: prev[productId]?.qtyFullReturned ?? (item.qtyFullReturned || 0),
        qtyEmptyReturned: prev[productId]?.qtyEmptyReturned ?? (item.qtyEmptyReturned || 0),
        qtyDamaged: prev[productId]?.qtyDamaged ?? (item.qtyDamaged || 0),
        [field]: value,
      },
    }));
  };

  return (
    <Card data-testid={`card-return-request-${returnRequest.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
            Return #{returnRequest.id}
          </CardTitle>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p data-testid={`text-return-trip-${returnRequest.id}`}>
              Trip ID: {returnRequest.tripId}
            </p>
            <p data-testid={`text-return-delivery-man-${returnRequest.id}`}>
              Delivery Man: {deliveryMan?.name || `ID ${returnRequest.submittedByDeliveryManId}`}
            </p>
            <p>Submitted: {returnRequest.submittedAt ? new Date(returnRequest.submittedAt).toLocaleString() : "N/A"}</p>
            {returnRequest.deliveryManNote && (
              <p>Delivery Man Note: {returnRequest.deliveryManNote}</p>
            )}
          </div>
        </div>
        <Badge
          variant={isPending ? "secondary" : returnRequest.status === "VERIFIED" ? "default" : "destructive"}
          className="no-default-hover-elevate"
          data-testid={`badge-return-status-${returnRequest.id}`}
        >
          {returnRequest.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : returnItems && returnItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Full Returned</TableHead>
                <TableHead className="text-right">Empty Returned</TableHead>
                <TableHead className="text-right">Damaged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <TableRow key={item.id} data-testid={`row-return-item-${item.id}`}>
                    <TableCell className="font-medium">
                      {product?.name || `Product #${item.productId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-20 ml-auto"
                          value={verifiedQtys[item.productId]?.qtyFullReturned ?? (item.qtyFullReturned || 0)}
                          onChange={(e) =>
                            updateVerifiedQty(item.productId, "qtyFullReturned", parseInt(e.target.value) || 0, item)
                          }
                          data-testid={`input-full-returned-${item.productId}-${returnRequest.id}`}
                        />
                      ) : (
                        <Badge variant="secondary" className="no-default-hover-elevate">{item.qtyFullReturned || 0}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-20 ml-auto"
                          value={verifiedQtys[item.productId]?.qtyEmptyReturned ?? (item.qtyEmptyReturned || 0)}
                          onChange={(e) =>
                            updateVerifiedQty(item.productId, "qtyEmptyReturned", parseInt(e.target.value) || 0, item)
                          }
                          data-testid={`input-empty-returned-${item.productId}-${returnRequest.id}`}
                        />
                      ) : (
                        <Badge variant="secondary" className="no-default-hover-elevate">{item.qtyEmptyReturned || 0}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-20 ml-auto"
                          value={verifiedQtys[item.productId]?.qtyDamaged ?? (item.qtyDamaged || 0)}
                          onChange={(e) =>
                            updateVerifiedQty(item.productId, "qtyDamaged", parseInt(e.target.value) || 0, item)
                          }
                          data-testid={`input-damaged-${item.productId}-${returnRequest.id}`}
                        />
                      ) : (
                        <Badge variant="secondary" className="no-default-hover-elevate">{item.qtyDamaged || 0}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No return items found.</p>
        )}

        {isPending && (
          <div className="space-y-4 border-t pt-4">
            <Textarea
              placeholder="Gatekeeper verification note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              data-testid={`textarea-return-note-${returnRequest.id}`}
            />
            <Button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white border-green-700"
              data-testid={`button-verify-return-${returnRequest.id}`}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Verify Return
            </Button>
          </div>
        )}

        {!isPending && returnRequest.gatekeeperNote && (
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground">
              Note: {returnRequest.gatekeeperNote}
            </p>
            {returnRequest.verifiedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Verified: {new Date(returnRequest.verifiedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GatekeeperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [movementType, setMovementType] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementNote, setMovementNote] = useState("");

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: staff, isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: pendingPickups, isLoading: pendingPickupsLoading } = useQuery<PickupRequest[]>({
    queryKey: ["/api/gatekeeper/pickup-requests?status=PENDING"],
  });

  const { data: processedPickups, isLoading: processedPickupsLoading } = useQuery<PickupRequest[]>({
    queryKey: ["/api/gatekeeper/pickup-requests?status=APPROVED"],
  });

  const { data: rejectedPickups } = useQuery<PickupRequest[]>({
    queryKey: ["/api/gatekeeper/pickup-requests?status=REJECTED"],
  });

  const { data: pendingReturns, isLoading: pendingReturnsLoading } = useQuery<TripReturnRequest[]>({
    queryKey: ["/api/gatekeeper/returns?status=PENDING_VERIFY"],
  });

  const { data: verifiedReturns } = useQuery<TripReturnRequest[]>({
    queryKey: ["/api/gatekeeper/returns?status=VERIFIED"],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: { type: string; productId: number; quantity: number; note: string }) => {
      await apiRequest("POST", "/api/stock-movements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Stock movement created", description: "Movement recorded successfully." });
      setMovementType("");
      setProductId("");
      setQuantity("");
      setMovementNote("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    },
  });

  const handleCreateMovement = () => {
    if (!movementType || !productId || !quantity) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required fields." });
      return;
    }
    createMovementMutation.mutate({
      type: movementType,
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      note: movementNote,
    });
  };

  const today = new Date().toDateString();
  const todayMovements = movements?.filter(
    (m) => m.createdAt && new Date(m.createdAt).toDateString() === today
  ) ?? [];

  const issuedToday = todayMovements.filter((m) => m.type === "ISSUE").reduce((sum, m) => sum + m.quantity, 0);
  const returnedToday = todayMovements.filter((m) => m.type === "RETURN").reduce((sum, m) => sum + m.quantity, 0);
  const totalMovements = movements?.length ?? 0;

  const issuedMovements = todayMovements.filter((m) => m.type === "ISSUE");
  const returnedMovements = todayMovements.filter((m) => m.type === "RETURN");

  const getProductName = (pid: number | null) => {
    if (!pid || !products) return "Unknown";
    return products.find((p) => p.id === pid)?.name ?? "Unknown";
  };

  const recentProcessed = [
    ...(processedPickups || []),
    ...(rejectedPickups || []),
  ].sort((a, b) => {
    const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : 0;
    const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : 0;
    return bTime - aTime;
  }).slice(0, 10);

  const pendingPickupCount = pendingPickups?.length ?? 0;
  const pendingReturnCount = pendingReturns?.length ?? 0;

  const isBaseLoading = productsLoading || staffLoading || vehiclesLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold" data-testid="text-gatekeeper-dashboard-title">
          Gate Keeper Dashboard
        </h1>

        <Tabs defaultValue="pickup-requests">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-gatekeeper">
            <TabsTrigger value="pickup-requests" data-testid="tab-pickup-requests">
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              Pickup Requests
              {pendingPickupCount > 0 && (
                <Badge variant="destructive" className="ml-2 no-default-hover-elevate">
                  {pendingPickupCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="return-verification" data-testid="tab-return-verification">
              <ArrowDownToLine className="h-4 w-4 mr-1.5" />
              Return Verification
              {pendingReturnCount > 0 && (
                <Badge variant="destructive" className="ml-2 no-default-hover-elevate">
                  {pendingReturnCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stock-movements" data-testid="tab-stock-movements">
              <Activity className="h-4 w-4 mr-1.5" />
              Stock Movements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup-requests" className="space-y-6 mt-6">
            {isBaseLoading || pendingPickupsLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-orange-500" />
                    Pending Pickup Requests
                  </h2>
                  {pendingPickups && pendingPickups.length > 0 ? (
                    <div className="space-y-4">
                      {pendingPickups.map((request) => (
                        <PickupRequestCard
                          key={request.id}
                          request={request}
                          products={products || []}
                          staff={staff || []}
                          vehicles={vehicles || []}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                        <p className="text-muted-foreground" data-testid="text-no-pending-pickups">
                          No pending pickup requests. All clear!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Recently Processed
                  </h2>
                  {recentProcessed.length > 0 ? (
                    <div className="space-y-4">
                      {recentProcessed.map((request) => (
                        <PickupRequestCard
                          key={request.id}
                          request={request}
                          products={products || []}
                          staff={staff || []}
                          vehicles={vehicles || []}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-6 text-center">
                        <p className="text-muted-foreground text-sm" data-testid="text-no-processed-pickups">
                          No recently processed requests.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="return-verification" className="space-y-6 mt-6">
            {isBaseLoading || pendingReturnsLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-orange-500" />
                    Pending Return Verification
                  </h2>
                  {pendingReturns && pendingReturns.length > 0 ? (
                    <div className="space-y-4">
                      {pendingReturns.map((ret) => (
                        <ReturnVerificationCard
                          key={ret.id}
                          returnRequest={ret}
                          products={products || []}
                          staff={staff || []}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                        <p className="text-muted-foreground" data-testid="text-no-pending-returns">
                          No pending return verifications. All clear!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Recently Verified Returns
                  </h2>
                  {verifiedReturns && verifiedReturns.length > 0 ? (
                    <div className="space-y-4">
                      {verifiedReturns.map((ret) => (
                        <ReturnVerificationCard
                          key={ret.id}
                          returnRequest={ret}
                          products={products || []}
                          staff={staff || []}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-6 text-center">
                        <p className="text-muted-foreground text-sm" data-testid="text-no-verified-returns">
                          No recently verified returns.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="stock-movements" className="space-y-6 mt-6">
            {movementsLoading || productsLoading || inventoryLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "Cylinders Issued Today", value: issuedToday, icon: ArrowUpFromLine, color: "text-orange-500" },
                    { title: "Cylinders Returned Today", value: returnedToday, icon: ArrowDownToLine, color: "text-green-500" },
                    { title: "Total Movements", value: totalMovements, icon: Activity, color: "text-blue-500" },
                  ].map((card) => (
                    <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {card.title}
                        </CardTitle>
                        <card.icon className={`h-5 w-5 ${card.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid={`text-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                          {card.value}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card data-testid="card-new-movement-form">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      New Stock Movement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Select value={movementType} onValueChange={setMovementType}>
                        <SelectTrigger data-testid="select-movement-type">
                          <SelectValue placeholder="Movement Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ISSUE">Issue</SelectItem>
                          <SelectItem value="RETURN">Return</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={productId} onValueChange={setProductId}>
                        <SelectTrigger data-testid="select-product">
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="1"
                        data-testid="input-quantity"
                      />

                      <Button
                        onClick={handleCreateMovement}
                        disabled={createMovementMutation.isPending}
                        data-testid="button-create-movement"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Record Movement
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Textarea
                        placeholder="Note (optional)"
                        value={movementNote}
                        onChange={(e) => setMovementNote(e.target.value)}
                        className="resize-none"
                        data-testid="textarea-note"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card data-testid="card-cylinders-issued">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                        Cylinders Issued Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {issuedMovements.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead>Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {issuedMovements.map((m) => (
                              <TableRow key={m.id} data-testid={`row-issued-${m.id}`}>
                                <TableCell className="font-medium">
                                  {getProductName(m.productId)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="no-default-hover-elevate">
                                    {m.quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {m.note || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm" data-testid="text-no-issued">
                          No cylinders issued today.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card data-testid="card-cylinders-returned">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowDownToLine className="h-5 w-5 text-green-500" />
                        Cylinders Returned Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {returnedMovements.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead>Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {returnedMovements.map((m) => (
                              <TableRow key={m.id} data-testid={`row-returned-${m.id}`}>
                                <TableCell className="font-medium">
                                  {getProductName(m.productId)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="no-default-hover-elevate">
                                    {m.quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {m.note || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm" data-testid="text-no-returned">
                          No cylinders returned today.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="card-inventory-overview">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Inventory Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventoryData && inventoryData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead>Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryData.map((item) => (
                            <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                              <TableCell className="font-medium">{item.type}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.status === "FILLED" || item.status === "IN_STOCK" ? "secondary" : "outline"}
                                  className="no-default-hover-elevate"
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-muted-foreground">{item.location || "-"}</TableCell>
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

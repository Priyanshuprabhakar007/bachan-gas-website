import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Route as RouteIcon,
  Truck,
  CheckCircle,
  PackageCheck,
  Download,
  Search,
} from "lucide-react";

interface TripSummary {
  id: number;
  tripId: string;
  vehicleNumber: string;
  deliveryManName: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  stopsCount: number;
  totalAmountCollected: number;
  returnStatus: string;
}

interface DailyTripsResponse {
  trips: TripSummary[];
  summary: {
    totalTrips: number;
    activeTrips: number;
    completedTrips: number;
    totalDeliveries: number;
  };
}

interface TripStop {
  id: number;
  customerName: string;
  address: string;
  deliveries: {
    productName: string;
    quantity: number;
    amountPaise: number;
  }[];
  payments: {
    method: string;
    amountPaise: number;
    status: string;
  }[];
}

interface TripDetail {
  id: number;
  tripId: string;
  vehicle: {
    number: string;
    type: string;
  };
  driver: {
    name: string;
    phone: string;
  };
  status: string;
  startTime: string | null;
  endTime: string | null;
  inventoryIssued: {
    productName: string;
    quantity: number;
  }[];
  stops: TripStop[];
  returnVerification: {
    status: string;
    verifiedBy: string | null;
    verifiedAt: string | null;
    notes: string | null;
  };
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "IN_PROGRESS":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function getReturnStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toUpperCase()) {
    case "VERIFIED":
      return "secondary";
    case "PENDING":
      return "outline";
    case "DISCREPANCY":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMM yyyy, hh:mm a");
  } catch {
    return "-";
  }
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "hh:mm a");
  } catch {
    return "-";
  }
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
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

function TripDetailDialog({
  tripId,
  open,
  onOpenChange,
}: {
  tripId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detail, isLoading } = useQuery<TripDetail>({
    queryKey: ["/api/admin/reports/trips", tripId],
    enabled: open && tripId !== null,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-trip-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-trip-detail-title">
            Trip Details {detail?.tripId ? `- ${detail.tripId}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4" data-testid="status-trip-detail-loading">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-6" data-testid="container-trip-detail">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold" data-testid="text-detail-vehicle-number">{detail.vehicle.number}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-detail-vehicle-type">{detail.vehicle.type}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold" data-testid="text-detail-driver-name">{detail.driver.name}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-detail-driver-phone">{detail.driver.phone}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={getStatusBadgeVariant(detail.status)} data-testid="badge-detail-status">
                {detail.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm text-muted-foreground" data-testid="text-detail-time-range">
                {formatDateTime(detail.startTime)} — {formatDateTime(detail.endTime)}
              </span>
            </div>

            {detail.inventoryIssued && detail.inventoryIssued.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Inventory Issued</h4>
                <Table data-testid="table-inventory-issued">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.inventoryIssued.map((item, idx) => (
                      <TableRow key={idx} data-testid={`row-inventory-${idx}`}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {detail.stops && detail.stops.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Stops ({detail.stops.length})</h4>
                <Accordion type="multiple" data-testid="accordion-stops">
                  {detail.stops.map((stop, idx) => (
                    <AccordionItem key={stop.id} value={`stop-${stop.id}`} data-testid={`accordion-item-stop-${idx}`}>
                      <AccordionTrigger className="text-sm" data-testid={`button-stop-toggle-${idx}`}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{stop.customerName}</span>
                          <span className="text-muted-foreground">— {stop.address}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-2">
                          {stop.deliveries.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Deliveries</p>
                              <Table data-testid={`table-stop-deliveries-${idx}`}>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {stop.deliveries.map((d, dIdx) => (
                                    <TableRow key={dIdx}>
                                      <TableCell className="text-sm">{d.productName}</TableCell>
                                      <TableCell className="text-sm text-right">{d.quantity}</TableCell>
                                      <TableCell className="text-sm text-right">{formatCurrency(d.amountPaise)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                          {stop.payments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Payments</p>
                              <Table data-testid={`table-stop-payments-${idx}`}>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {stop.payments.map((p, pIdx) => (
                                    <TableRow key={pIdx}>
                                      <TableCell className="text-sm">{p.method}</TableCell>
                                      <TableCell className="text-sm text-right">{formatCurrency(p.amountPaise)}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {p.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">Return Verification</h4>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant={getReturnStatusBadgeVariant(detail.returnVerification.status)}
                      data-testid="badge-return-status"
                    >
                      {detail.returnVerification.status}
                    </Badge>
                    {detail.returnVerification.verifiedBy && (
                      <span className="text-sm text-muted-foreground" data-testid="text-return-verified-by">
                        by {detail.returnVerification.verifiedBy}
                      </span>
                    )}
                    {detail.returnVerification.verifiedAt && (
                      <span className="text-sm text-muted-foreground" data-testid="text-return-verified-at">
                        at {formatDateTime(detail.returnVerification.verifiedAt)}
                      </span>
                    )}
                  </div>
                  {detail.returnVerification.notes && (
                    <p className="text-sm text-muted-foreground mt-2" data-testid="text-return-notes">
                      {detail.returnVerification.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="text-no-trip-detail">
            No trip details available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ReportsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useQuery<DailyTripsResponse>({
    queryKey: ["/api/admin/reports/daily-trips", { from: appliedFrom, to: appliedTo }],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/reports/daily-trips?from=${appliedFrom}&to=${appliedTo}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
  });

  const handleApply = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleExportCSV = () => {
    const url = `/api/admin/reports/daily-trips/export.csv?from=${appliedFrom}&to=${appliedTo}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-trips-${appliedFrom}-to-${appliedTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRowClick = (tripDbId: number) => {
    setSelectedTripId(tripDbId);
    setDetailOpen(true);
  };

  const summary = data?.summary ?? {
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalDeliveries: 0,
  };

  const trips = data?.trips ?? [];

  const statCards = [
    { title: "Total Trips", value: summary.totalTrips, icon: RouteIcon, color: "text-blue-500" },
    { title: "Active Trips", value: summary.activeTrips, icon: Truck, color: "text-yellow-500" },
    { title: "Completed Trips", value: summary.completedTrips, icon: CheckCircle, color: "text-green-500" },
    { title: "Total Deliveries", value: summary.totalDeliveries, icon: PackageCheck, color: "text-purple-500" },
  ];

  if (isLoading) {
    return (
      <div data-testid="reports-loading">
        <h1 className="text-2xl font-semibold mb-6">Daily Trip Reports</h1>
        <ReportsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">
        Daily Trip Reports
      </h1>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="from-date" className="text-sm font-medium text-muted-foreground">
            From
          </label>
          <Input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            data-testid="input-from-date"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="to-date" className="text-sm font-medium text-muted-foreground">
            To
          </label>
          <Input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            data-testid="input-to-date"
          />
        </div>
        <Button onClick={handleApply} data-testid="button-apply-filter">
          <Search className="h-4 w-4 mr-1" />
          Apply
        </Button>
        <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {card.value.toLocaleString("en-IN")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-trips">
            <TableHeader>
              <TableRow>
                <TableHead>Trip ID</TableHead>
                <TableHead>Vehicle Number</TableHead>
                <TableHead>Delivery Man</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right"># Stops</TableHead>
                <TableHead className="text-right">Amount Collected</TableHead>
                <TableHead>Return Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8" data-testid="text-no-trips">
                    No trips found for the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleRowClick(trip.id)}
                    data-testid={`row-trip-${trip.id}`}
                  >
                    <TableCell className="font-mono text-sm" data-testid={`text-trip-id-${trip.id}`}>
                      {trip.tripId}
                    </TableCell>
                    <TableCell data-testid={`text-vehicle-${trip.id}`}>
                      {trip.vehicleNumber}
                    </TableCell>
                    <TableCell data-testid={`text-driver-${trip.id}`}>
                      {trip.deliveryManName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(trip.status)}
                        data-testid={`badge-status-${trip.id}`}
                      >
                        {trip.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-start-time-${trip.id}`}>
                      {formatTime(trip.startTime)}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-end-time-${trip.id}`}>
                      {formatTime(trip.endTime)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-stops-${trip.id}`}>
                      {trip.stopsCount}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-amount-${trip.id}`}>
                      {formatCurrency(trip.totalAmountCollected)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getReturnStatusBadgeVariant(trip.returnStatus)}
                        data-testid={`badge-return-${trip.id}`}
                      >
                        {trip.returnStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TripDetailDialog
        tripId={selectedTripId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

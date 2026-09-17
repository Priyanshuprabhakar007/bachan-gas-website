import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Truck, CheckSquare } from "lucide-react";
import type { GatePass } from "@shared/schema";
import { useMemo } from "react";

function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getGatePassStatusProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (status) {
    case "OPEN":
      return { variant: "secondary", className: "bg-blue-500/15 text-blue-400" };
    case "RECONCILED":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    case "CLOSED":
      return { variant: "secondary", className: "bg-gray-500/15 text-gray-400" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function GatePassSkeleton() {
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

export default function GatePassPage() {
  const { data: gatePasses, isLoading } = useQuery<GatePass[]>({
    queryKey: ["/api/gate-passes"],
  });

  const stats = useMemo(() => {
    if (!gatePasses) return { total: 0, open: 0, reconciled: 0 };
    return {
      total: gatePasses.length,
      open: gatePasses.filter((g) => g.status === "OPEN").length,
      reconciled: gatePasses.filter((g) => g.status === "RECONCILED").length,
    };
  }, [gatePasses]);

  if (isLoading) {
    return (
      <div className="p-6" data-testid="gatepass-loading">
        <h1 className="text-2xl font-semibold mb-6">Gate Passes</h1>
        <GatePassSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="gatepass-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Gate Passes</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="card-total-passes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Passes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-passes">{stats.total}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-open-passes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-open-passes">{stats.open}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-reconciled-passes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reconciled</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reconciled-passes">{stats.reconciled}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-gate-passes">
            <TableHeader>
              <TableRow>
                <TableHead>Gate Pass No</TableHead>
                <TableHead>Delivery Man</TableHead>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Odometer Start</TableHead>
                <TableHead>Odometer End</TableHead>
                <TableHead>Deliveries</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!gatePasses || gatePasses.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No gate passes found
                  </TableCell>
                </TableRow>
              ) : (
                gatePasses.map((gp) => {
                  const statusProps = getGatePassStatusProps(gp.status ?? "OPEN");
                  return (
                    <TableRow key={gp.id} data-testid={`row-gatepass-${gp.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-gatepass-no-${gp.id}`}>
                        {gp.gatePassNo}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-delivery-man-${gp.id}`}>
                        {gp.deliveryManName ?? "-"}
                      </TableCell>
                      <TableCell data-testid={`text-vehicle-no-${gp.id}`}>
                        {gp.vehicleNo ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusProps.variant}
                          className={statusProps.className}
                          data-testid={`badge-status-${gp.id}`}
                        >
                          {gp.status ?? "OPEN"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-odometer-start-${gp.id}`}>
                        {gp.odometerStart ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-odometer-end-${gp.id}`}>
                        {gp.odometerEnd ?? "-"}
                      </TableCell>
                      <TableCell data-testid={`text-deliveries-${gp.id}`}>
                        {gp.deliveriesCount ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-date-${gp.id}`}>
                        {formatDate(gp.date)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

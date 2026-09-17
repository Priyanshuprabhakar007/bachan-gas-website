import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { Users, Home, Building2, IndianRupee, Search } from "lucide-react";
import type { User } from "@shared/schema";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
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

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const { data: customers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/customers"],
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    let result = customers;

    if (typeFilter !== "ALL") {
      result = result.filter((c) => c.customerType === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.consumerId?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [customers, search, typeFilter]);

  const stats = useMemo(() => {
    if (!customers) return { total: 0, domestic: 0, commercial: 0, outstanding: 0 };
    return {
      total: customers.length,
      domestic: customers.filter((c) => c.customerType === "DOMESTIC").length,
      commercial: customers.filter((c) => c.customerType === "COMMERCIAL").length,
      outstanding: customers.reduce((sum, c) => sum + (c.outstandingBalance ?? 0), 0),
    };
  }, [customers]);

  if (isLoading) {
    return (
      <div className="p-6" data-testid="customers-loading">
        <h1 className="text-2xl font-semibold mb-6">Customers</h1>
        <CustomersSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="customers-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Customers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-customers"
            placeholder="Search by name, phone, consumer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-customer-type">
            <SelectValue placeholder="Customer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" data-testid="select-item-all">All Types</SelectItem>
            <SelectItem value="DOMESTIC" data-testid="select-item-domestic">Domestic</SelectItem>
            <SelectItem value="COMMERCIAL" data-testid="select-item-commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">{stats.total}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-domestic-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Domestic</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-domestic-count">{stats.domestic}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-commercial-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commercial</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-commercial-count">{stats.commercial}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outstanding">
              {formatCurrency(stats.outstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-customers">
            <TableHeader>
              <TableRow>
                <TableHead>Consumer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`text-consumer-id-${customer.id}`}>
                      {customer.consumerId || "-"}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-name-${customer.id}`}>
                      {customer.name}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${customer.id}`}>
                      {customer.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          customer.customerType === "DOMESTIC"
                            ? "bg-blue-500/15 text-blue-400"
                            : customer.customerType === "COMMERCIAL"
                            ? "bg-purple-500/15 text-purple-400"
                            : ""
                        }
                        data-testid={`badge-type-${customer.id}`}
                      >
                        {customer.customerType || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-route-${customer.id}`}>
                      {customer.route || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-outstanding-${customer.id}`}>
                      {formatCurrency(customer.outstandingBalance ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={customer.isActive ? "secondary" : "destructive"}
                        className={customer.isActive ? "bg-green-500/15 text-green-400" : ""}
                        data-testid={`badge-status-${customer.id}`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

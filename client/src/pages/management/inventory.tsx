import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, PackageCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Inventory } from "@shared/schema";

function formatCylinderType(type: string): string {
  switch (type) {
    case "DOMESTIC_14": return "14.2kg Domestic";
    case "COMMERCIAL_19": return "19kg Commercial";
    case "LARGE_47": return "47kg Large";
    case "COMPOSITE": return "Composite";
    default: return type;
  }
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableQuantityCell({
  inventoryId,
  currentQuantity,
}: {
  inventoryId: number;
  currentQuantity: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(currentQuantity));
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (newQuantity: number) => {
      await apiRequest("PUT", `/api/inventory/${inventoryId}`, {
        quantity: newQuantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Quantity updated" });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      setValue(String(currentQuantity));
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      setValue(String(currentQuantity));
      setIsEditing(false);
      return;
    }
    if (num === currentQuantity) {
      setIsEditing(false);
      return;
    }
    mutation.mutate(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(String(currentQuantity));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-20"
        autoFocus
        min={0}
        disabled={mutation.isPending}
        data-testid={`input-quantity-${inventoryId}`}
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setValue(String(currentQuantity));
        setIsEditing(true);
      }}
      data-testid={`button-edit-quantity-${inventoryId}`}
    >
      {currentQuantity}
    </Button>
  );
}

export default function InventoryPage() {
  const { data: inventoryItems, isLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  if (isLoading || !inventoryItems) {
    return (
      <div className="p-6" data-testid="inventory-loading">
        <h1 className="text-2xl font-semibold mb-6">Inventory</h1>
        <InventorySkeleton />
      </div>
    );
  }

  const totalFilled = inventoryItems
    .filter((item) => item.status === "FILLED")
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const totalEmpty = inventoryItems
    .filter((item) => item.status === "EMPTY")
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="p-6 space-y-6" data-testid="inventory-page">
      <h1 className="text-2xl font-semibold" data-testid="text-inventory-title">
        Inventory
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card data-testid="card-total-filled">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Filled
            </CardTitle>
            <PackageCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-filled">
              {totalFilled}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-empty">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Empty
            </CardTitle>
            <Package className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-empty">
              {totalEmpty}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-inventory-table">
        <CardHeader>
          <CardTitle className="text-lg">Cylinder Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                    <TableCell className="font-medium" data-testid={`text-inventory-type-${item.id}`}>
                      {formatCylinderType(item.type)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === "FILLED" ? "secondary" : "destructive"}
                        className={
                          item.status === "FILLED"
                            ? "bg-green-500/20 text-green-400 no-default-hover-elevate"
                            : "no-default-hover-elevate"
                        }
                        data-testid={`badge-inventory-status-${item.id}`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EditableQuantityCell
                        inventoryId={item.id}
                        currentQuantity={item.quantity || 0}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-inventory-location-${item.id}`}>
                      {item.location || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm" data-testid="text-no-inventory">
              No inventory items found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store as StoreIcon, Phone, Mail, Clock, MapPin } from "lucide-react";
import type { Store } from "@shared/schema";

function StoresSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StoresPage() {
  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  if (isLoading) {
    return (
      <div className="p-6" data-testid="stores-loading">
        <h1 className="text-2xl font-semibold mb-6">Stores</h1>
        <StoresSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="stores-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Stores</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(!stores || stores.length === 0) ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-stores">No stores found</p>
            </CardContent>
          </Card>
        ) : (
          stores.map((store) => (
            <Card key={store.id} data-testid={`card-store-${store.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="text-base font-semibold" data-testid={`text-store-name-${store.id}`}>
                  {store.name}
                </CardTitle>
                <Badge
                  variant={store.isActive ? "secondary" : "destructive"}
                  className={store.isActive ? "bg-green-500/15 text-green-400" : ""}
                  data-testid={`badge-status-${store.id}`}
                >
                  {store.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(store.addressLine || store.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-address-${store.id}`}>
                      {[store.addressLine, store.city, store.state, store.pincode].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-phone-${store.id}`}>{store.phone}</span>
                  </div>
                )}
                {store.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-email-${store.id}`}>{store.email}</span>
                  </div>
                )}
                {store.openingHours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-hours-${store.id}`}>{store.openingHours}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

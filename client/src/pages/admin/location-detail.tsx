import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import {
  Building2,
  Package,
  Users,
  Edit,
  Warehouse,
  DollarSign,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import type { LocationWithDetails, AppUserWithDetails } from "@shared/schema";

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: location, isLoading: locationLoading } = useQuery<LocationWithDetails>({
    queryKey: ["/api/admin/locations", id],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AppUserWithDetails[]>({
    queryKey: ["/api/admin/locations", id, "users"],
  });

  const isLoading = locationLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/locations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <CardGridSkeleton count={4} />
        <TableSkeleton rows={3} />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium">Location not found</h2>
          <Link href="/admin/locations">
            <Button variant="ghost">Back to locations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/admin/locations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{location.name}</h1>
              {location.pricingEnabled && (
                <Badge variant="secondary">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {location.pricingType === "per_pound"
                    ? `$${location.perPoundRate}/lb`
                    : "Range Pricing"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Location Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/location/${id}`}>
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Dashboard
            </Button>
          </Link>
          <Link href={`/admin/locations/${id}/edit`}>
            <Button data-testid="button-edit-location">
              <Edit className="w-4 h-4 mr-2" />
              Edit Location
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Packages"
          value={location.packageCount || 0}
          icon={Package}
          testId="stats-packages"
        />
        <StatsCard
          title="Storage Locations"
          value={location.storageLocations?.length || 0}
          icon={Warehouse}
          testId="stats-storage"
        />
        <StatsCard
          title="Assigned Users"
          value={users?.length || 0}
          icon={Users}
          testId="stats-users"
        />
        <StatsCard
          title="Pricing"
          value={location.pricingEnabled ? "Enabled" : "Disabled"}
          icon={DollarSign}
          testId="stats-pricing"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle>Storage Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {location.storageLocations?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No storage locations configured
              </p>
            ) : (
              <div className="space-y-2">
                {location.storageLocations?.map((storage) => (
                  <div
                    key={storage.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <Warehouse className="w-4 h-4 text-muted-foreground" />
                    <span>{storage.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <CardTitle>Assigned Users</CardTitle>
            <Link href={`/admin/users/new?locationId=${id}`}>
              <Button size="sm" variant="outline">
                Add User
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {users?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users assigned to this location
              </p>
            ) : (
              <div className="space-y-2">
                {users?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {location.pricingEnabled && location.pricingType === "range_based" && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            {location.pricingTiers?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pricing tiers configured
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {location.pricingTiers?.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm">
                      {tier.minWeight} - {tier.maxWeight} lbs
                    </span>
                    <span className="font-medium">${tier.price}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

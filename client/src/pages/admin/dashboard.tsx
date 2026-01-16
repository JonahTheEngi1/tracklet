import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { Building2, Package, Users, Plus, ArrowRight, DollarSign } from "lucide-react";
import type { LocationWithDetails } from "@shared/schema";

export default function AdminDashboard() {
  const { data: locations, isLoading: locationsLoading } = useQuery<LocationWithDetails[]>({
    queryKey: ["/api/admin/locations"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalLocations: number;
    totalPackages: number;
    totalUsers: number;
    pendingPackages: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const isLoading = locationsLoading || statsLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all locations and users</p>
        </div>
        <Link href="/admin/locations/new">
          <Button data-testid="button-new-location">
            <Plus className="w-4 h-4 mr-2" />
            New Location
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Locations"
            value={stats?.totalLocations || 0}
            icon={Building2}
            testId="stats-locations"
          />
          <StatsCard
            title="Total Packages"
            value={stats?.totalPackages || 0}
            subtitle={`${stats?.pendingPackages || 0} pending`}
            icon={Package}
            testId="stats-packages"
          />
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={Users}
            testId="stats-users"
          />
          <StatsCard
            title="Active Locations"
            value={locations?.filter(l => l.pricingEnabled).length || 0}
            subtitle="With pricing enabled"
            icon={DollarSign}
            testId="stats-pricing"
          />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle>Locations</CardTitle>
          <Link href="/admin/locations">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : locations?.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No locations yet</h3>
              <p className="text-muted-foreground mb-4">Create your first location to get started</p>
              <Link href="/admin/locations/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Location
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {locations?.slice(0, 5).map((location) => (
                <Link key={location.id} href={`/admin/locations/${location.id}`}>
                  <div
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`card-location-${location.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {location.packageCount || 0} packages · {location.userCount || 0} users
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {location.pricingEnabled && (
                        <Badge variant="secondary">
                          <DollarSign className="w-3 h-3 mr-1" />
                          Pricing
                        </Badge>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

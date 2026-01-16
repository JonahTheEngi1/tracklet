import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/loading-skeleton";
import { usePreview } from "@/contexts/preview-context";
import { Building2, Plus, Search, ArrowRight, DollarSign, Package, Users, Eye } from "lucide-react";
import { useState } from "react";
import type { LocationWithDetails } from "@shared/schema";

export default function AdminLocations() {
  const [search, setSearch] = useState("");
  const { startPreview } = usePreview();

  const { data: locations, isLoading } = useQuery<LocationWithDetails[]>({
    queryKey: ["/api/admin/locations"],
  });

  const handlePreview = (location: LocationWithDetails, role: "manager" | "employee", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPreview(location.id, location.name, role);
  };

  const filteredLocations = locations?.filter((loc) =>
    loc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Locations</h1>
          <p className="text-muted-foreground">Manage all business locations</p>
        </div>
        <Link href="/admin/locations/new">
          <Button data-testid="button-new-location">
            <Plus className="w-4 h-4 mr-2" />
            New Location
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-locations"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : filteredLocations?.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {search ? "No locations found" : "No locations yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create your first location to get started"}
              </p>
              {!search && (
                <Link href="/admin/locations/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Location
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations?.map((location) => (
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
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {location.packageCount || 0} packages
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {location.userCount || 0} users
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {location.pricingEnabled && (
                        <Badge variant="secondary">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {location.pricingType === "per_pound" ? "Per Pound" : "Range"}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => e.preventDefault()}
                            data-testid={`button-preview-${location.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview as
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => handlePreview(location, "manager", e as unknown as React.MouseEvent)}
                            data-testid={`menu-preview-manager-${location.id}`}
                          >
                            Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handlePreview(location, "employee", e as unknown as React.MouseEvent)}
                            data-testid={`menu-preview-employee-${location.id}`}
                          >
                            Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

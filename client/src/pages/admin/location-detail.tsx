import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/stats-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Package,
  Users,
  Edit,
  Warehouse,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { LocationWithDetails, AppUserWithDetails } from "@shared/schema";

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { data: location, isLoading: locationLoading } = useQuery<LocationWithDetails>({
    queryKey: ["/api/admin/locations", id],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AppUserWithDetails[]>({
    queryKey: ["/api/admin/locations", id, "users"],
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/locations/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      toast({ title: "Location suspended", description: "Users can no longer access this location." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to suspend location", variant: "destructive" });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/locations/${id}/unsuspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      toast({ title: "Location reactivated", description: "Users can now access this location." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reactivate location", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/admin/locations/${id}`, { confirmName: deleteConfirmName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      toast({ title: "Location deleted", description: "A backup was saved before deletion." });
      navigate("/admin/locations");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete location", variant: "destructive" });
    },
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">{location.name}</h1>
              {location.isSuspended && (
                <Badge variant="destructive">
                  <Ban className="w-3 h-3 mr-1" />
                  Suspended
                </Badge>
              )}
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

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            These actions are irreversible. Please proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border flex-wrap">
            <div>
              <p className="font-medium">
                {location.isSuspended ? "Reactivate Location" : "Suspend Location"}
              </p>
              <p className="text-sm text-muted-foreground">
                {location.isSuspended
                  ? "Allow users to access this location again."
                  : "Temporarily disable access for all users at this location."}
              </p>
            </div>
            {location.isSuspended ? (
              <Button
                variant="outline"
                onClick={() => unsuspendMutation.mutate()}
                disabled={unsuspendMutation.isPending}
                data-testid="button-unsuspend-location"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Reactivate
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending}
                data-testid="button-suspend-location"
              >
                <Ban className="w-4 h-4 mr-2" />
                Suspend
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/50 flex-wrap">
            <div>
              <p className="font-medium text-destructive">Delete Location</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this location and all associated data. A backup will be saved.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-location"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Location
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete the location
                <strong className="text-foreground"> {location.name}</strong> and all associated:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Packages ({location.packageCount || 0} total)</li>
                <li>Storage locations ({location.storageLocations?.length || 0} total)</li>
                <li>User assignments ({users?.length || 0} users)</li>
                <li>Pricing tiers</li>
              </ul>
              <p className="text-sm">
                A backup will be automatically saved to JSONBin before deletion.
              </p>
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">
                  Type <span className="font-mono bg-muted px-1 rounded">{location.name}</span> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Enter location name"
                  data-testid="input-confirm-delete"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteConfirmName !== location.name || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Location"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

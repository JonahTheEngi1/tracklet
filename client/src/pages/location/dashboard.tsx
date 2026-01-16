import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { PackageTable } from "@/components/package-table";
import { PackageForm } from "@/components/package-form";
import { RecipientSummaryCard } from "@/components/recipient-summary-card";
import { PrintView } from "@/components/print-view";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { Package, DollarSign, Clock, Search, Plus, Printer, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  LocationWithDetails,
  PackageWithStorageLocation,
  StorageLocation,
  SearchResult,
  ArchivedPackage,
} from "@shared/schema";

interface LocationDashboardProps {
  locationId?: string;
}

export default function LocationDashboard({ locationId: propLocationId }: LocationDashboardProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propLocationId || paramId;
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [showArchiveSearch, setShowArchiveSearch] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: location, isLoading: locationLoading } = useQuery<LocationWithDetails>({
    queryKey: ["/api/locations", id],
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<PackageWithStorageLocation[]>({
    queryKey: ["/api/locations", id, "packages"],
  });

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ["/api/locations", id, "storage-locations"],
  });

  const { data: stats } = useQuery<{
    totalPackages: number;
    pendingPackages: number;
    totalValue: number;
  }>({
    queryKey: ["/api/locations", id, "stats"],
  });

  const { data: searchResult, isLoading: summaryLoading } = useQuery<SearchResult | null>({
    queryKey: ["/api/locations", id, "search", search],
    enabled: search.length >= 2,
  });

  const { data: archivedPackages, isLoading: archiveLoading } = useQuery<ArchivedPackage[]>({
    queryKey: ["/api/locations", id, "packages", "archive", "search", archiveSearch],
    queryFn: async () => {
      const res = await fetch(`/api/locations/${id}/packages/archive/search?q=${encodeURIComponent(archiveSearch)}`);
      if (!res.ok) throw new Error("Failed to search archive");
      return res.json();
    },
    enabled: archiveSearch.length >= 2,
  });

  const addPackageMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/locations/${id}/packages`, {
        ...data,
        weight: data.weight,
        locationId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "stats"] });
      setIsAddOpen(false);
      toast({
        title: "Package added",
        description: "The package has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add package",
        variant: "destructive",
      });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async ({ packageId, pickedUpByLastName }: { packageId: string; pickedUpByLastName: string }) => {
      return apiRequest("PATCH", `/api/locations/${id}/packages/${packageId}`, {
        isDelivered: true,
        pickedUpByLastName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "search"] });
      toast({
        title: "Package marked as delivered",
        description: "The package has been marked as delivered.",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ packageIds, updates }: { packageIds: string[]; updates: Record<string, any> }) => {
      return apiRequest("PATCH", `/api/locations/${id}/packages/bulk`, {
        packageIds,
        updates,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "search"] });
      
      const count = variables.packageIds.length;
      if (variables.updates.isDelivered) {
        toast({
          title: "Packages marked as delivered",
          description: `${count} package${count > 1 ? "s" : ""} marked as delivered.`,
        });
      } else if (variables.updates.recipientName) {
        toast({
          title: "Recipient names updated",
          description: `Updated recipient name for ${count} package${count > 1 ? "s" : ""}.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update packages",
        variant: "destructive",
      });
    },
  });

  const handleBulkMarkDelivered = (packageIds: string[], pickedUpByLastName: string) => {
    bulkUpdateMutation.mutate({ packageIds, updates: { isDelivered: true, pickedUpByLastName } });
  };

  const handleBulkEditNames = (packageIds: string[], newName: string) => {
    bulkUpdateMutation.mutate({ packageIds, updates: { recipientName: newName } });
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  const isLoading = locationLoading || packagesLoading;

  const filteredPackages = search.length >= 2 && searchResult
    ? searchResult.allPackages
    : packages || [];

  return (
    <div className="p-6 space-y-6">
      {showPrintView && searchResult && searchResult.recipientSummaries.length > 0 && (
        <div ref={printRef}>
          {searchResult.recipientSummaries.map((summary, index) => (
            <PrintView
              key={`print-${summary.recipientName}-${index}`}
              summary={summary}
              locationName={location?.name || ""}
              pricingEnabled={location?.pricingEnabled || false}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{location?.name || "Loading..."}</h1>
          <p className="text-muted-foreground">Package Management</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-package">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
            </DialogHeader>
            <PackageForm
              storageLocations={storageLocations || []}
              onSubmit={(data) => addPackageMutation.mutate(data)}
              isPending={addPackageMutation.isPending}
              onCancel={() => setIsAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Pending Packages"
            value={stats?.pendingPackages || 0}
            subtitle="Awaiting pickup"
            icon={Clock}
            testId="stats-pending"
          />
          <StatsCard
            title="Total Packages"
            value={stats?.totalPackages || 0}
            icon={Package}
            testId="stats-total"
          />
          {location?.pricingEnabled && (
            <StatsCard
              title="Total Value"
              value={`$${(stats?.totalValue || 0).toFixed(2)}`}
              subtitle="Pending packages"
              icon={DollarSign}
              testId="stats-value"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or tracking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-packages"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-delivered"
            checked={showDelivered}
            onCheckedChange={setShowDelivered}
            data-testid="switch-show-delivered"
          />
          <Label htmlFor="show-delivered" className="text-sm">
            Show delivered
          </Label>
        </div>
      </div>

      {search.length >= 2 && searchResult && !summaryLoading && !searchResult.tooManyRecipients && (
        <div className="flex flex-col gap-3">
          {searchResult.recipientSummaries
            .filter(summary => summary.pendingPackages > 0)
            .map((summary, index) => (
              <RecipientSummaryCard
                key={`${summary.recipientName}-${index}`}
                summary={summary}
                pricingEnabled={location?.pricingEnabled || false}
                onPrint={() => {
                  setShowPrintView(true);
                  setTimeout(() => {
                    window.print();
                    setShowPrintView(false);
                  }, 100);
                }}
                onDeliverAll={handleBulkMarkDelivered}
                isDelivering={bulkUpdateMutation.isPending}
              />
            ))}
        </div>
      )}

      {search.length >= 2 && !searchResult && !summaryLoading && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No packages found for "{search}"</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle>
            {search.length >= 2 ? "Search Results" : "All Packages"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <PackageTable
              packages={filteredPackages}
              pricingEnabled={location?.pricingEnabled || false}
              onMarkDelivered={(packageId, pickedUpByLastName) => markDeliveredMutation.mutate({ packageId, pickedUpByLastName })}
              onBulkMarkDelivered={handleBulkMarkDelivered}
              onBulkEditNames={handleBulkEditNames}
              isMarkingDelivered={markDeliveredMutation.isPending}
              isBulkUpdating={bulkUpdateMutation.isPending}
              showDelivered={showDelivered}
            />
          )}
        </CardContent>
      </Card>

      <Collapsible open={showArchiveSearch} onOpenChange={setShowArchiveSearch}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center gap-4 cursor-pointer hover-elevate">
              {showArchiveSearch ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Search Cold Storage</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground ml-auto">
                Packages delivered over 2 months ago
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search archived packages..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-archive-search"
                />
              </div>

              {archiveSearch.length >= 2 && archiveLoading && (
                <TableSkeleton rows={3} />
              )}

              {archiveSearch.length >= 2 && !archiveLoading && archivedPackages && archivedPackages.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Picked Up By</TableHead>
                      <TableHead>Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedPackages.map((pkg) => (
                      <TableRow key={pkg.id} data-testid={`row-archived-${pkg.id}`}>
                        <TableCell className="font-mono text-sm">{pkg.trackingNumber}</TableCell>
                        <TableCell>{pkg.recipientName}</TableCell>
                        <TableCell>{pkg.pickedUpByLastName || "-"}</TableCell>
                        <TableCell>
                          {pkg.deliveredAt ? format(new Date(pkg.deliveredAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {archiveSearch.length >= 2 && !archiveLoading && (!archivedPackages || archivedPackages.length === 0) && (
                <div className="text-center py-8">
                  <Archive className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No archived packages found for "{archiveSearch}"</p>
                </div>
              )}

              {archiveSearch.length < 2 && (
                <div className="text-center py-8">
                  <Archive className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Enter at least 2 characters to search archived packages</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

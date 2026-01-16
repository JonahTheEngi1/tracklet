import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Check, Package as PackageIcon, Pencil, User } from "lucide-react";
import type { PackageWithStorageLocation } from "@shared/schema";

interface PackageTableProps {
  packages: PackageWithStorageLocation[];
  pricingEnabled: boolean;
  onMarkDelivered?: (packageId: string, pickedUpByLastName: string) => void;
  onBulkMarkDelivered?: (packageIds: string[], pickedUpByLastName: string) => void;
  onBulkEditNames?: (packageIds: string[], newName: string) => void;
  isMarkingDelivered?: boolean;
  isBulkUpdating?: boolean;
  showDelivered?: boolean;
}

export function PackageTable({
  packages,
  pricingEnabled,
  onMarkDelivered,
  onBulkMarkDelivered,
  onBulkEditNames,
  isMarkingDelivered,
  isBulkUpdating,
  showDelivered = false,
}: PackageTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [isDeliverOpen, setIsDeliverOpen] = useState(false);
  const [isBulkDeliverOpen, setIsBulkDeliverOpen] = useState(false);
  const [deliverPackageId, setDeliverPackageId] = useState<string | null>(null);
  const [pickedUpByLastName, setPickedUpByLastName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 25;

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const togglePackageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPackages(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPackages.size === filteredPackages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(filteredPackages.map(p => p.id)));
    }
  };

  const handleSingleDeliver = () => {
    if (onMarkDelivered && deliverPackageId && pickedUpByLastName.trim()) {
      onMarkDelivered(deliverPackageId, pickedUpByLastName.trim());
      setIsDeliverOpen(false);
      setDeliverPackageId(null);
      setPickedUpByLastName("");
    }
  };

  const handleBulkMarkDelivered = () => {
    if (onBulkMarkDelivered && selectedPackages.size > 0 && pickedUpByLastName.trim()) {
      onBulkMarkDelivered(Array.from(selectedPackages), pickedUpByLastName.trim());
      setSelectedPackages(new Set());
      setIsBulkDeliverOpen(false);
      setPickedUpByLastName("");
    }
  };

  const openDeliverDialog = (packageId: string) => {
    setDeliverPackageId(packageId);
    setPickedUpByLastName("");
    setIsDeliverOpen(true);
  };

  const openBulkDeliverDialog = () => {
    setPickedUpByLastName("");
    setIsBulkDeliverOpen(true);
  };

  const handleBulkEditNames = () => {
    if (onBulkEditNames && selectedPackages.size > 0 && newRecipientName.trim()) {
      onBulkEditNames(Array.from(selectedPackages), newRecipientName.trim());
      setSelectedPackages(new Set());
      setIsEditNameOpen(false);
      setNewRecipientName("");
    }
  };

  const filteredPackages = useMemo(() => 
    showDelivered ? packages : packages.filter(p => !p.isDelivered),
    [packages, showDelivered]
  );

  const filteredPackageIds = useMemo(() => 
    new Set(filteredPackages.map(p => p.id)),
    [filteredPackages]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredPackages.length / PAGE_SIZE);
  const paginatedPackages = useMemo(() => {
    if (showAll) return filteredPackages;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredPackages.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPackages, currentPage, showAll]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [showDelivered, packages.length]);

  // Clear selection when filter changes or packages update
  useEffect(() => {
    setSelectedPackages(prev => {
      const validSelection = new Set(Array.from(prev).filter(id => filteredPackageIds.has(id)));
      if (validSelection.size !== prev.size) {
        return validSelection;
      }
      return prev;
    });
  }, [filteredPackageIds]);

  const selectedPendingPackages = filteredPackages.filter(
    p => selectedPackages.has(p.id) && !p.isDelivered
  );

  if (filteredPackages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PackageIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No packages found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {showDelivered ? "No packages match your search." : "No pending packages at this time."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPackages.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedPackages.size} package{selectedPackages.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {selectedPendingPackages.length > 0 && onBulkMarkDelivered && (
              <Button
                size="sm"
                variant="outline"
                onClick={openBulkDeliverDialog}
                disabled={isBulkUpdating}
                data-testid="button-bulk-deliver"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark Delivered ({selectedPendingPackages.length})
              </Button>
            )}
            {onBulkEditNames && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditNameOpen(true)}
                disabled={isBulkUpdating}
                data-testid="button-bulk-edit-names"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit Names
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedPackages(new Set())}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Recipient Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will update the recipient name for {selectedPackages.size} selected package{selectedPackages.size > 1 ? "s" : ""}.
            </p>
            <Input
              placeholder="New recipient name"
              value={newRecipientName}
              onChange={(e) => setNewRecipientName(e.target.value)}
              data-testid="input-bulk-recipient-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditNameOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkEditNames}
              disabled={!newRecipientName.trim() || isBulkUpdating}
              data-testid="button-confirm-bulk-edit"
            >
              Update Names
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeliverOpen} onOpenChange={setIsDeliverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Package as Delivered</DialogTitle>
            <DialogDescription>
              Please enter the last name of the person picking up this package.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-last-name">Pickup Person's Last Name</Label>
              <Input
                id="pickup-last-name"
                placeholder="Last name"
                value={pickedUpByLastName}
                onChange={(e) => setPickedUpByLastName(e.target.value)}
                data-testid="input-pickup-last-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeliverOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSingleDeliver}
              disabled={!pickedUpByLastName.trim() || isMarkingDelivered}
              data-testid="button-confirm-deliver"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeliverOpen} onOpenChange={setIsBulkDeliverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark {selectedPendingPackages.length} Package{selectedPendingPackages.length > 1 ? "s" : ""} as Delivered</DialogTitle>
            <DialogDescription>
              Please enter the last name of the person picking up these packages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-pickup-last-name">Pickup Person's Last Name</Label>
              <Input
                id="bulk-pickup-last-name"
                placeholder="Last name"
                value={pickedUpByLastName}
                onChange={(e) => setPickedUpByLastName(e.target.value)}
                data-testid="input-bulk-pickup-last-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeliverOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkMarkDelivered}
              disabled={!pickedUpByLastName.trim() || isBulkUpdating}
              data-testid="button-confirm-bulk-deliver"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedPackages.size === filteredPackages.length && filteredPackages.length > 0}
                  onCheckedChange={toggleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>Tracking Number</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Date of Entry</TableHead>
              <TableHead>Storage</TableHead>
              {pricingEnabled && <TableHead className="text-right">Cost</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPackages.map((pkg) => (
              <Collapsible key={pkg.id} asChild open={expandedRows.has(pkg.id)}>
                <>
                  <TableRow 
                    className="hover-elevate cursor-pointer"
                    onClick={() => toggleRow(pkg.id)}
                    data-testid={`row-package-${pkg.id}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedPackages.has(pkg.id)}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedPackages);
                          if (newSelected.has(pkg.id)) {
                            newSelected.delete(pkg.id);
                          } else {
                            newSelected.add(pkg.id);
                          }
                          setSelectedPackages(newSelected);
                        }}
                        data-testid={`checkbox-package-${pkg.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6">
                          {expandedRows.has(pkg.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-mono text-sm" data-testid={`text-tracking-${pkg.id}`}>
                      {pkg.trackingNumber}
                    </TableCell>
                    <TableCell data-testid={`text-recipient-${pkg.id}`}>
                      {pkg.recipientName}
                    </TableCell>
                    <TableCell>
                      {pkg.createdAt ? format(new Date(pkg.createdAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {pkg.storageLocation?.name ? (
                        <Badge variant="secondary">{pkg.storageLocation.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {pricingEnabled && (
                      <TableCell className="text-right font-medium">
                        ${(pkg.calculatedCost || 0).toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {!pkg.isDelivered && onMarkDelivered && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeliverDialog(pkg.id);
                          }}
                          disabled={isMarkingDelivered}
                          data-testid={`button-deliver-${pkg.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Delivered
                        </Button>
                      )}
                      {pkg.isDelivered && (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <User className="w-3 h-3 mr-1" />
                            {(pkg as any).pickedUpByLastName || "Delivered"}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={pricingEnabled ? 8 : 7} className="py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Weight</p>
                            <p className="font-medium">{pkg.weight} lbs</p>
                          </div>
                          {pricingEnabled && (
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cost Breakdown</p>
                              <p className="font-medium">${(pkg.calculatedCost || 0).toFixed(2)}</p>
                            </div>
                          )}
                          <div className="md:col-span-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm">{pkg.notes || "No notes"}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredPackages.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {showAll ? (
              `Showing all ${filteredPackages.length} packages`
            ) : (
              `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredPackages.length)} of ${filteredPackages.length} packages`
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showAll && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAll(!showAll);
                setCurrentPage(1);
              }}
              data-testid="button-toggle-view-all"
            >
              {showAll ? "Show Pages" : "View All"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

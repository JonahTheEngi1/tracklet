import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StorageLocationForm } from "@/components/storage-location-form";
import { TableSkeleton } from "@/components/loading-skeleton";
import { Warehouse, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StorageLocation } from "@shared/schema";

interface StorageLocationsPageProps {
  locationId?: string;
}

export default function StorageLocationsPage({ locationId: propLocationId }: StorageLocationsPageProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propLocationId || paramId;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: storageLocations, isLoading } = useQuery<StorageLocation[]>({
    queryKey: ["/api/locations", id, "storage-locations"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", `/api/locations/${id}/storage-locations`, {
        ...data,
        locationId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "storage-locations"] });
      setIsAddOpen(false);
      toast({
        title: "Storage location added",
        description: "The storage location has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add storage location",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (storageId: string) => {
      return apiRequest("DELETE", `/api/locations/${id}/storage-locations/${storageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", id, "storage-locations"] });
      toast({
        title: "Storage location deleted",
        description: "The storage location has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete storage location",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Storage Locations</h1>
          <p className="text-muted-foreground">Organize your inventory with storage areas</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-storage">
              <Plus className="w-4 h-4 mr-2" />
              Add Storage Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Storage Location</DialogTitle>
            </DialogHeader>
            <StorageLocationForm
              onSubmit={(data) => addMutation.mutate(data)}
              isPending={addMutation.isPending}
              onCancel={() => setIsAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Storage Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : storageLocations?.length === 0 ? (
            <div className="text-center py-8">
              <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No storage locations</h3>
              <p className="text-muted-foreground mb-4">
                Create storage locations to organize packages
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Storage Location
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {storageLocations?.map((storage) => (
                <div
                  key={storage.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`card-storage-${storage.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{storage.name}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-storage-${storage.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete storage location?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{storage.name}" from your storage locations. Packages
                          assigned to this location will have their storage location cleared.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(storage.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

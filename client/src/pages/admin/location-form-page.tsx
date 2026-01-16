import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LocationForm } from "@/components/location-form";
import { FormSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LocationWithDetails } from "@shared/schema";

export default function LocationFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = id !== undefined && id !== "new";

  const { data: location, isLoading } = useQuery<LocationWithDetails>({
    queryKey: ["/api/admin/locations", id],
    enabled: isEdit,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Location created",
        description: "The location has been created successfully.",
      });
      navigate("/admin/locations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/admin/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/locations", id] });
      toast({
        title: "Location updated",
        description: "The location has been updated successfully.",
      });
      navigate("/admin/locations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: any) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Location</CardTitle>
          </CardHeader>
          <CardContent>
            <FormSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Location" : "Create New Location"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Update the location details and pricing configuration"
              : "Add a new business location to the system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationForm
            defaultValues={
              isEdit && location
                ? {
                    name: location.name,
                    pricingEnabled: location.pricingEnabled,
                    pricingType: location.pricingType || "per_pound",
                    perPoundRate: location.perPoundRate || "",
                    pricingTiers: location.pricingTiers?.map((t) => ({
                      minWeight: String(t.minWeight),
                      maxWeight: String(t.maxWeight),
                      price: String(t.price),
                    })),
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            isPending={createMutation.isPending || updateMutation.isPending}
            onCancel={() => navigate("/admin/locations")}
            isEdit={isEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StorageLocation } from "@shared/schema";

const packageFormSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  weight: z.string().min(1, "Weight is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Weight must be a positive number",
  }),
  storageLocationId: z.string().optional(),
  notes: z.string().optional(),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

interface PackageFormProps {
  storageLocations: StorageLocation[];
  onSubmit: (data: PackageFormValues) => void;
  isPending?: boolean;
  onCancel?: () => void;
}

export function PackageForm({ storageLocations, onSubmit, isPending, onCancel }: PackageFormProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      trackingNumber: "",
      recipientName: "",
      weight: "",
      storageLocationId: "",
      notes: "",
    },
  });

  const handleSubmit = (data: PackageFormValues) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="trackingNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tracking Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter tracking number"
                  {...field}
                  data-testid="input-tracking-number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter recipient name"
                  {...field}
                  data-testid="input-recipient-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (lbs)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter weight"
                  {...field}
                  data-testid="input-weight"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storageLocationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Location</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-storage-location">
                    <SelectValue placeholder="Select storage location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {storageLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this package"
                  className="resize-none"
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending} data-testid="button-save-package">
            {isPending ? "Saving..." : "Save Package"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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

const storageLocationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type StorageLocationFormValues = z.infer<typeof storageLocationFormSchema>;

interface StorageLocationFormProps {
  onSubmit: (data: StorageLocationFormValues) => void;
  isPending?: boolean;
  onCancel?: () => void;
}

export function StorageLocationForm({
  onSubmit,
  isPending,
  onCancel,
}: StorageLocationFormProps) {
  const form = useForm<StorageLocationFormValues>({
    resolver: zodResolver(storageLocationFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const handleSubmit = (data: StorageLocationFormValues) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Location Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Shelf A, Bin 1, Locker 5"
                  {...field}
                  data-testid="input-storage-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending} data-testid="button-save-storage">
            {isPending ? "Saving..." : "Add Storage Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

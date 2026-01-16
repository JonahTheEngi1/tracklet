import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const pricingTierSchema = z.object({
  minWeight: z.string().min(1, "Min weight required"),
  maxWeight: z.string().min(1, "Max weight required"),
  price: z.string().min(1, "Price required"),
});

const locationFormSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  pricingEnabled: z.boolean(),
  pricingType: z.enum(["per_pound", "range_based"]),
  perPoundRate: z.string().optional(),
  pricingTiers: z.array(pricingTierSchema).optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  defaultValues?: Partial<LocationFormValues>;
  onSubmit: (data: LocationFormValues) => void;
  isPending?: boolean;
  onCancel?: () => void;
  isEdit?: boolean;
}

export function LocationForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  isEdit = false,
}: LocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      pricingEnabled: defaultValues?.pricingEnabled || false,
      pricingType: defaultValues?.pricingType || "per_pound",
      perPoundRate: defaultValues?.perPoundRate || "",
      pricingTiers: defaultValues?.pricingTiers || [{ minWeight: "0", maxWeight: "1", price: "5" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pricingTiers",
  });

  const pricingEnabled = form.watch("pricingEnabled");
  const pricingType = form.watch("pricingType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter business name"
                  {...field}
                  data-testid="input-location-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Pricing Configuration</CardTitle>
              <FormField
                control={form.control}
                name="pricingEnabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-pricing-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>

          {pricingEnabled && (
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="pricingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Model</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="per_pound" id="per_pound" />
                          <label htmlFor="per_pound" className="text-sm cursor-pointer">
                            Per Pound
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="range_based" id="range_based" />
                          <label htmlFor="range_based" className="text-sm cursor-pointer">
                            Range Based
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pricingType === "per_pound" && (
                <FormField
                  control={form.control}
                  name="perPoundRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate per Pound ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="5.00"
                          {...field}
                          data-testid="input-per-pound-rate"
                        />
                      </FormControl>
                      <FormDescription>
                        Amount to charge per pound of package weight
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {pricingType === "range_based" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <FormLabel>Pricing Tiers</FormLabel>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => append({ minWeight: "", maxWeight: "", price: "" })}
                      data-testid="button-add-tier"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Tier
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`pricingTiers.${index}.minWeight`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Min lbs"
                                  {...field}
                                  data-testid={`input-min-weight-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">to</span>
                        <FormField
                          control={form.control}
                          name={`pricingTiers.${index}.maxWeight`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Max lbs"
                                  {...field}
                                  data-testid={`input-max-weight-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">=</span>
                        <FormField
                          control={form.control}
                          name={`pricingTiers.${index}.price`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="$"
                                  {...field}
                                  data-testid={`input-tier-price-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-tier-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending} data-testid="button-save-location">
            {isPending ? "Saving..." : isEdit ? "Update Location" : "Create Location"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

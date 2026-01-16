import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Package, DollarSign, Printer, CheckCircle } from "lucide-react";
import type { RecipientSummary } from "@shared/schema";

interface RecipientSummaryCardProps {
  summary: RecipientSummary;
  pricingEnabled: boolean;
  onPrint: () => void;
  onDeliverAll?: (packageIds: string[], pickedUpByLastName: string) => void;
  isDelivering?: boolean;
}

export function RecipientSummaryCard({ 
  summary, 
  pricingEnabled, 
  onPrint, 
  onDeliverAll,
  isDelivering 
}: RecipientSummaryCardProps) {
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [lastName, setLastName] = useState("");

  const pendingPackageIds = summary.packages
    .filter(p => !p.isDelivered)
    .map(p => p.id);

  const handleDeliverAll = () => {
    if (lastName.trim() && onDeliverAll) {
      onDeliverAll(pendingPackageIds, lastName.trim());
      setLastName("");
      setDeliverOpen(false);
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">Recipient</p>
              <p className="text-lg font-semibold" data-testid="text-recipient-name">
                {summary.recipientName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Packages</p>
                <p className="text-lg font-semibold" data-testid="text-package-count">
                  {summary.pendingPackages} pending{summary.deliveredPackages > 0 && `, ${summary.deliveredPackages} delivered`}
                </p>
              </div>
            </div>
            {pricingEnabled && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-semibold text-primary" data-testid="text-total-cost">
                    ${summary.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {summary.pendingPackages > 0 && onDeliverAll && (
              <Popover open={deliverOpen} onOpenChange={setDeliverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    data-testid="button-deliver-all"
                    disabled={isDelivering}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Deliver All
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <Label htmlFor="pickup-lastname">Picked up by (last name)</Label>
                    <Input
                      id="pickup-lastname"
                      placeholder="Enter last name..."
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleDeliverAll();
                        }
                      }}
                      data-testid="input-deliver-all-lastname"
                    />
                    <Button
                      onClick={handleDeliverAll}
                      disabled={!lastName.trim() || isDelivering}
                      className="w-full"
                      data-testid="button-confirm-deliver-all"
                    >
                      {isDelivering ? "Delivering..." : `Deliver ${pendingPackageIds.length} package${pendingPackageIds.length !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button onClick={onPrint} data-testid="button-print-recipient">
              <Printer className="w-4 h-4 mr-2" />
              Print for Recipient
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Plus, Trash2, Eye, Download, Check, X } from "lucide-react";
import type { InvoiceWithItems, Location } from "@shared/schema";
import { format } from "date-fns";

interface InvoicesPageProps {
  locationId: string;
}

interface InvoiceItemInput {
  name: string;
  quantity: string;
  unitPrice: string;
}

export default function InvoicesPage({ locationId }: InvoicesPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  
  const [billedTo, setBilledTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItemInput[]>([{ name: "", quantity: "1", unitPrice: "" }]);

  const { data: location } = useQuery<Location>({
    queryKey: ["/api/locations", locationId],
  });

  const { data: invoices, isLoading } = useQuery<InvoiceWithItems[]>({
    queryKey: ["/api/locations", locationId, "invoices"],
    enabled: !!location?.invoiceEnabled,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { billedTo: string; dueDate: string; items: InvoiceItemInput[] }) => {
      return apiRequest("POST", `/api/locations/${locationId}/invoices`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", locationId, "invoices"] });
      toast({ title: "Invoice created", description: "The invoice has been created successfully." });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create invoice", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "unpaid" }) => {
      return apiRequest("PATCH", `/api/invoices/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", locationId, "invoices"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations", locationId, "invoices"] });
      toast({ title: "Invoice deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setBilledTo("");
    setDueDate("");
    setItems([{ name: "", quantity: "1", unitPrice: "" }]);
  };

  const addItem = () => {
    setItems([...items, { name: "", quantity: "1", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItemInput, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const handleCreate = () => {
    if (!billedTo.trim()) {
      toast({ title: "Error", description: "Please enter a billing recipient", variant: "destructive" });
      return;
    }
    if (!dueDate) {
      toast({ title: "Error", description: "Please select a due date", variant: "destructive" });
      return;
    }
    if (items.some(item => !item.name.trim() || !item.unitPrice)) {
      toast({ title: "Error", description: "Please fill in all item details", variant: "destructive" });
      return;
    }
    createMutation.mutate({ billedTo, dueDate, items });
  };

  const generatePDF = async (invoice: InvoiceWithItems) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Add logo in top left if available
    if (invoice.locationLogo) {
      try {
        doc.addImage(invoice.locationLogo, "PNG", 15, 10, 30, 30);
      } catch (e) {
        console.error("Failed to add logo to PDF:", e);
      }
    }

    doc.setFontSize(20);
    const headerText = invoice.status === "paid" ? "RECEIPT" : "INVOICE";
    doc.text(headerText, pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(14);
    doc.text(invoice.locationBusinessName || invoice.locationName || "", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, y);
    y += 6;
    doc.text(`Date: ${format(new Date(invoice.createdAt!), "MMM d, yyyy")}`, 20, y);
    y += 6;
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMM d, yyyy")}`, 20, y);
    y += 6;
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, y);
    y += 12;

    doc.setFontSize(12);
    doc.text("BILLED TO:", 20, y);
    y += 6;
    doc.setFontSize(10);
    const billedToLines = invoice.billedTo.split("\n");
    billedToLines.forEach((line) => {
      doc.text(line, 20, y);
      y += 5;
    });
    y += 8;

    doc.setFontSize(12);
    doc.text("ITEMS:", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.text("Description", 20, y);
    doc.text("Qty", 120, y);
    doc.text("Price", 140, y);
    doc.text("Total", 170, y);
    y += 6;
    doc.line(20, y, pageWidth - 20, y);
    y += 4;

    invoice.items.forEach((item) => {
      doc.text(item.name, 20, y);
      doc.text(String(item.quantity), 120, y);
      doc.text(`$${item.unitPrice}`, 140, y);
      doc.text(`$${item.total}`, 170, y);
      y += 6;
    });

    y += 6;
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(14);
    doc.text(`TOTAL: $${invoice.total}`, pageWidth - 20, y, { align: "right" });

    doc.save(`${invoice.invoiceNumber}.pdf`);
    toast({ title: "Invoice downloaded" });
  };

  if (!location?.invoiceEnabled) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium">Invoicing Not Enabled</h2>
          <p className="text-muted-foreground">
            Contact an administrator to enable invoicing for this location.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground">Create and manage invoices</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : invoices?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">Create your first invoice to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Billed To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.billedTo}</TableCell>
                    <TableCell>${invoice.total}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowViewDialog(true);
                          }}
                          data-testid={`button-view-invoice-${invoice.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => generatePDF(invoice)}
                          data-testid={`button-download-invoice-${invoice.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {invoice.status === "unpaid" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: "paid" })}
                            data-testid={`button-mark-paid-${invoice.id}`}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateStatusMutation.mutate({ id: invoice.id, status: "unpaid" })}
                            data-testid={`button-mark-unpaid-${invoice.id}`}
                          >
                            <X className="w-4 h-4 text-orange-600" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(invoice.id)}
                          data-testid={`button-delete-invoice-${invoice.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice with line items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billedTo">Billed To</Label>
                <Textarea
                  id="billedTo"
                  placeholder="Customer name and address"
                  value={billedTo}
                  onChange={(e) => setBilledTo(e.target.value)}
                  data-testid="input-billed-to"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="button-add-item">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="flex-1"
                      data-testid={`input-item-name-${index}`}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="w-20"
                      data-testid={`input-item-qty-${index}`}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      className="w-24"
                      data-testid={`input-item-price-${index}`}
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-invoice">
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              {selectedInvoice.locationLogo && (
                <img 
                  src={selectedInvoice.locationLogo} 
                  alt="Logo" 
                  className="h-12 w-auto object-contain"
                />
              )}
              
              <div className="text-lg font-semibold">
                {selectedInvoice.locationBusinessName || selectedInvoice.locationName}
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #:</span>
                  <span>{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(selectedInvoice.createdAt!), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={selectedInvoice.status === "paid" ? "default" : "secondary"}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground mb-1">Billed To:</div>
                <div className="whitespace-pre-line">{selectedInvoice.billedTo}</div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground mb-2">Items:</div>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.name} (x{item.quantity})</span>
                      <span>${item.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${selectedInvoice.total}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedInvoice && (
              <Button onClick={() => generatePDF(selectedInvoice)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

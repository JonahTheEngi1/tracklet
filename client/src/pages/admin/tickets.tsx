import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  User,
  Building2,
} from "lucide-react";
import type { TicketWithMessages } from "@shared/schema";

const statusColors: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  resolved: "bg-green-500/10 text-green-600 border-green-500/20",
  closed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusIcons: Record<string, React.ComponentType<any>> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: XCircle,
};

export default function AdminTickets() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery<TicketWithMessages[]>({
    queryKey: ["/api/admin/tickets"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/tickets/${ticketId}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      if (selectedTicket && selectedTicket.id === variables.ticketId) {
        setSelectedTicket({ ...selectedTicket, status: variables.status as any });
      }
      toast({ title: "Status updated" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const response = await apiRequest("POST", `/api/admin/tickets/${ticketId}/messages`, { message });
      return response.json();
    },
    onSuccess: (newMessage, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      if (selectedTicket && selectedTicket.id === variables.ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), newMessage],
        });
      }
      setNewMessage("");
      toast({ title: "Message sent" });
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    if (filter === "all") return true;
    return ticket.status === filter;
  });

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return;
    sendMessageMutation.mutate({ ticketId: selectedTicket.id, message: newMessage });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage and respond to user support requests</p>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage and respond to user support requests</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filteredTickets?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium">No tickets found</h2>
            <p className="text-muted-foreground">There are no support tickets matching your filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status] || AlertCircle;
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedTicket(ticket)}
                data-testid={`ticket-card-${ticket.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{ticket.subject}</h3>
                        <Badge variant="outline" className={statusColors[ticket.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {ticket.locationName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {ticket.messages?.length || 0} messages
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ticket.createdAt && new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4 flex-wrap">
              <span>{selectedTicket?.subject}</span>
              <Select
                value={selectedTicket?.status}
                onValueChange={(status) => {
                  if (selectedTicket) {
                    updateStatusMutation.mutate({ ticketId: selectedTicket.id, status });
                  }
                }}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-update-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-3">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {selectedTicket?.userName}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {selectedTicket?.locationName}
            </span>
          </div>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4 py-4">
              {selectedTicket?.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.isAdmin
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {msg.createdAt && new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedTicket?.status !== "closed" && (
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                placeholder="Type your response..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-ticket-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

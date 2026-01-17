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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Ticket,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Plus,
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

export default function UserTickets({ locationId }: { locationId?: string }) {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");

  const { data: tickets, isLoading } = useQuery<TicketWithMessages[]>({
    queryKey: ["/api/tickets"],
  });

  const createTicketMutation = useMutation({
    mutationFn: async ({ subject, message }: { subject: string; message: string }) => {
      return apiRequest("POST", "/api/tickets", { subject, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setShowNewTicket(false);
      setNewTicketSubject("");
      setNewTicketMessage("");
      toast({ title: "Ticket created", description: "Your support request has been submitted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create ticket", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const response = await apiRequest("POST", `/api/tickets/${ticketId}/messages`, { message });
      return response.json();
    },
    onSuccess: (newMessage, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
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

  const handleCreateTicket = () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;
    createTicketMutation.mutate({ subject: newTicketSubject, message: newTicketMessage });
  };

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return;
    sendMessageMutation.mutate({ ticketId: selectedTicket.id, message: newMessage });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-muted-foreground">Get help with any issues or questions</p>
        </div>
        <TableSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-muted-foreground">Get help with any issues or questions</p>
        </div>
        <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ticket">
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className="mt-1"
                  data-testid="input-ticket-subject"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  className="mt-1 min-h-[120px]"
                  data-testid="input-ticket-body"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={!newTicketSubject.trim() || !newTicketMessage.trim() || createTicketMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!tickets?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium">No tickets yet</h2>
            <p className="text-muted-foreground mb-4">
              Create a ticket if you need help with anything.
            </p>
            <Button onClick={() => setShowNewTicket(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => {
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
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedTicket?.subject}</span>
              {selectedTicket && (
                <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                  {selectedTicket.status.replace("_", " ")}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4 py-4">
              {selectedTicket?.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.isAdmin
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1">
                      {msg.isAdmin ? "Support Team" : "You"}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.isAdmin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
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
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-reply-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                data-testid="button-send-reply"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {selectedTicket?.status === "closed" && (
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              This ticket is closed. Create a new ticket if you need further assistance.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

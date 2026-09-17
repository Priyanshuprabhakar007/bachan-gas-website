import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Ticket, AlertCircle, Clock, CheckCircle, MoreHorizontal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceTicket } from "@shared/schema";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function getPriorityBadgeProps(priority: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (priority) {
    case "HIGH":
      return { variant: "destructive", className: "" };
    case "MEDIUM":
      return { variant: "secondary", className: "bg-yellow-500/15 text-yellow-400" };
    case "LOW":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function getStatusBadgeProps(status: string): { variant: "default" | "secondary" | "destructive" | "outline"; className: string } {
  switch (status) {
    case "OPEN":
      return { variant: "secondary", className: "bg-blue-500/15 text-blue-400" };
    case "IN_PROGRESS":
      return { variant: "secondary", className: "bg-yellow-500/15 text-yellow-400" };
    case "RESOLVED":
      return { variant: "secondary", className: "bg-green-500/15 text-green-400" };
    case "CLOSED":
      return { variant: "secondary", className: "bg-gray-500/15 text-gray-400" };
    default:
      return { variant: "secondary", className: "" };
  }
}

function TicketsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TicketsPage() {
  const { toast } = useToast();

  const { data: tickets, isLoading } = useQuery<ServiceTicket[]>({
    queryKey: ["/api/tickets"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/tickets/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, inProgress: 0, resolved: 0 };
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "OPEN").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      resolved: tickets.filter((t) => t.status === "RESOLVED").length,
    };
  }, [tickets]);

  if (isLoading) {
    return (
      <div className="p-6" data-testid="tickets-loading">
        <h1 className="text-2xl font-semibold mb-6">Tickets</h1>
        <TicketsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tickets-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tickets</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tickets">{stats.total}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-open-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-open-tickets">{stats.open}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-in-progress-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-in-progress-tickets">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-resolved-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-resolved-tickets">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table data-testid="table-tickets">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!tickets || tickets.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const priorityProps = getPriorityBadgeProps(ticket.priority ?? "MEDIUM");
                  const statusProps = getStatusBadgeProps(ticket.status ?? "OPEN");
                  return (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-ticket-id-${ticket.id}`}>
                        #{ticket.id}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-name-${ticket.id}`}>
                        {ticket.customerName ?? "-"}
                      </TableCell>
                      <TableCell data-testid={`text-subject-${ticket.id}`}>
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={priorityProps.variant}
                          className={priorityProps.className}
                          data-testid={`badge-priority-${ticket.id}`}
                        >
                          {ticket.priority ?? "MEDIUM"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusProps.variant}
                          className={statusProps.className}
                          data-testid={`badge-status-${ticket.id}`}
                        >
                          {formatStatusLabel(ticket.status ?? "OPEN")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-date-${ticket.id}`}>
                        {formatDate(ticket.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-actions-${ticket.id}`}
                              disabled={statusMutation.isPending}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`dropdown-actions-${ticket.id}`}>
                            {TICKET_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                data-testid={`menu-item-status-${s.toLowerCase()}-${ticket.id}`}
                                onClick={() => statusMutation.mutate({ id: ticket.id, status: s })}
                                disabled={ticket.status === s}
                              >
                                Mark as {formatStatusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

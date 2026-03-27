/**
 * StockTransferHistory - View and manage stock transfers
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  ArrowRight,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Store as StoreIcon,
  Warehouse,
  Package,
  Plus,
} from "lucide-react";
import { useLocation, StockTransfer } from "../contexts/LocationContext";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { StockTransferModal } from "../components/StockTransferModal";

export function StockTransferHistory() {
  const { transfers, locations, updateTransferStatus, selectedLocationId } = useLocation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StockTransfer["status"]>("all");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Filter transfers based on selected location, search, and status
  const filteredTransfers = transfers.filter((transfer) => {
    // Location filter
    if (selectedLocationId !== "all") {
      if (transfer.fromLocationId !== selectedLocationId && transfer.toLocationId !== selectedLocationId) {
        return false;
      }
    }

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      transfer.productName.toLowerCase().includes(searchLower) ||
      locations.find(l => l.id === transfer.fromLocationId)?.name.toLowerCase().includes(searchLower) ||
      locations.find(l => l.id === transfer.toLocationId)?.name.toLowerCase().includes(searchLower) ||
      transfer.initiatedByName.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: StockTransfer["status"]) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, className: "border-yellow-600 text-yellow-700 bg-yellow-50" },
      in_transit: { variant: "default" as const, icon: Loader2, className: "border-blue-600 text-blue-700 bg-blue-50" },
      completed: { variant: "default" as const, icon: CheckCircle, className: "border-green-600 text-green-700 bg-green-50" },
      cancelled: { variant: "destructive" as const, icon: XCircle, className: "border-red-600 text-red-700 bg-red-50" },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className={cn("w-3 h-3 mr-1", status === "in_transit" && "animate-spin")} />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getLocationIcon = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return <Package className="w-4 h-4" />;
    return location.type === "shop" ? (
      <StoreIcon className="w-4 h-4 text-[#0891b2]" />
    ) : (
      <Warehouse className="w-4 h-4 text-purple-600" />
    );
  };

  const handleStatusUpdate = async (transferId: string, newStatus: StockTransfer["status"]) => {
    try {
      await updateTransferStatus(transferId, newStatus, user?.id);
      toast.success(`Transfer status updated to ${newStatus.replace("_", " ")}`);
    } catch (error: any) {
      toast.error("Failed to update transfer status");
    }
  };

  // Statistics
  const stats = {
    total: transfers.length,
    pending: transfers.filter(t => t.status === "pending").length,
    inTransit: transfers.filter(t => t.status === "in_transit").length,
    completed: transfers.filter(t => t.status === "completed").length,
    cancelled: transfers.filter(t => t.status === "cancelled").length,
  };

  return (
    <div className="space-y-6 px-4 lg:px-8 pt-4 lg:pt-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Stock Transfer History</h1>
        <p className="text-muted-foreground mt-1">View and manage stock transfers between locations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Transfers</p>
              <p className="text-2xl font-bold text-[#0891b2] mt-1">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inTransit}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by product, location, or initiator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transfer History</CardTitle>
              <CardDescription>
                {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <Button
              className="bg-[#0891b2] hover:bg-[#0891b2]/90"
              onClick={() => setIsTransferModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transfer Route</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Initiated By</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer) => {
                  const fromLocation = locations.find(l => l.id === transfer.fromLocationId);
                  const toLocation = locations.find(l => l.id === transfer.toLocationId);

                  return (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(transfer.createdAt), "MMM dd, yyyy")}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transfer.createdAt), "HH:mm")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            {getLocationIcon(transfer.fromLocationId)}
                            <span className="text-sm font-medium">{fromLocation?.name || "Unknown"}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div className="flex items-center gap-1.5">
                            {getLocationIcon(transfer.toLocationId)}
                            <span className="text-sm font-medium">{toLocation?.name || "Unknown"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{transfer.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{transfer.quantity} units</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transfer.initiatedByName}
                          {transfer.completedBy && transfer.status === "completed" && (
                            <div className="text-xs text-muted-foreground">
                              Completed: {transfer.completedAt && format(new Date(transfer.completedAt), "MMM dd")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transfer.notes ? (
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={transfer.notes}>
                            {transfer.notes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {transfer.estimatedTime && transfer.status === "in_transit" && (
                          <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            ETA: {transfer.estimatedTime}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {transfer.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(transfer.id, "in_transit")}
                            >
                              Start
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(transfer.id, "cancelled")}
                              className="text-destructive"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {transfer.status === "in_transit" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(transfer.id, "completed")}
                            className="text-green-600"
                          >
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <StockTransferModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
      />
    </div>
  );
}
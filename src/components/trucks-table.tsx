"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stamp, Truck as TruckIcon, Search, ChevronLeft, ChevronRight, XCircle, RotateCcw, Pencil } from "lucide-react";
import { Truck } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "sonner";

interface TrucksTableProps {
  trucks: Truck[];
  onGeneratePermit: (truck: Truck) => void;
  onMarkLoaded: (truck: Truck) => void;
  onCancel?: (truck: Truck) => void;
  onEdit?: (truck: Truck) => void;
  onRestore?: (truck: Truck) => void;
  onBulkAction?: () => void;
  companyId?: number;
}

const ITEMS_PER_PAGE = 15;

export function TrucksTable({ trucks, onGeneratePermit, onMarkLoaded, onCancel, onEdit, onRestore, onBulkAction, companyId }: TrucksTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [transporterFilter, setTransporterFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [editTimeValue, setEditTimeValue] = useState("");

  // Get unique transporters for filter dropdown
  const transporters = useMemo(() => {
    const unique = [...new Set(trucks.map(t => t.transporter).filter(Boolean))];
    return unique.sort();
  }, [trucks]);

  const filteredTrucks = useMemo(() => {
    return trucks.filter(truck => {
      const matchesSearch = 
        truck.truck_trailer.toLowerCase().includes(search.toLowerCase()) ||
        truck.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        truck.transporter.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "pending" && (!truck.status || truck.status === "")) ||
        (statusFilter === "generated" && truck.status === "GENERATED") ||
        (statusFilter === "loaded" && truck.status === "LOADED") ||
        (statusFilter === "cancelled" && truck.status === "CANCELLED");

      const matchesProduct =
        productFilter === "all" ||
        (productFilter === "ago" && ["AGO", "DIESEL"].includes(truck.product.toUpperCase())) ||
        (productFilter === "pms" && ["PMS", "GASOLINE"].includes(truck.product.toUpperCase()));

      const matchesTransporter =
        transporterFilter === "all" || truck.transporter === transporterFilter;

      return matchesSearch && matchesStatus && matchesProduct && matchesTransporter;
    });
  }, [trucks, search, statusFilter, productFilter, transporterFilter]);

  const totalPages = Math.ceil(filteredTrucks.length / ITEMS_PER_PAGE);
  const paginatedTrucks = filteredTrucks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string, loaded: number) => {
    if (status === "CANCELLED") {
      return <Badge className="bg-red-500 hover:bg-red-600">CANCELLED</Badge>;
    }
    if (loaded) {
      return <Badge className="bg-green-500 hover:bg-green-600">LOADED</Badge>;
    }
    if (status === "GENERATED") {
      return <Badge className="bg-blue-500 hover:bg-blue-600">GENERATED</Badge>;
    }
    return <Badge variant="secondary">PENDING</Badge>;
  };

  const getProductBadge = (product: string) => {
    const p = product.toUpperCase();
    if (["AGO", "DIESEL"].includes(p)) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">{product}</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-600">{product}</Badge>;
  };

  // Bulk action handlers
  const pendingTrucks = paginatedTrucks.filter(t => !t.status || t.status === "");
  const selectedPendingCount = pendingTrucks.filter(t => selectedIds.has(t.id)).length;
  
  const toggleSelectAll = () => {
    const pendingIds = pendingTrucks.map(t => t.id);
    const allSelected = pendingIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkGenerate = async () => {
    const selectedTrucks = trucks.filter(t => selectedIds.has(t.id) && (!t.status || t.status === ""));
    if (selectedTrucks.length === 0) return;

    if (!confirm(`Generate permits for ${selectedTrucks.length} trucks?`)) return;

    setBulkLoading(true);
    let success = 0;
    let failed = 0;

    for (const truck of selectedTrucks) {
      try {
        const response = await fetch("/api/trucks/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ truckId: truck.id, permitNo: "", companyId }),
        });
        if (response.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkLoading(false);
    setSelectedIds(new Set());
    
    if (success > 0) {
      toast.success(`Generated permits for ${success} trucks${failed > 0 ? `, ${failed} failed` : ""}`);
    } else {
      toast.error("Failed to generate permits");
    }
    
    onBulkAction?.();
  };

  const handleBulkCancel = async () => {
    const selectedTrucks = trucks.filter(t => selectedIds.has(t.id) && t.status !== "CANCELLED" && t.status !== "LOADED");
    if (selectedTrucks.length === 0) return;

    if (!confirm(`Cancel ${selectedTrucks.length} trucks? Volume will be returned.`)) return;

    setBulkLoading(true);
    let success = 0;

    for (const truck of selectedTrucks) {
      try {
        const response = await fetch(`/api/trucks?id=${truck.id}&action=cancel${companyId ? `&companyId=${companyId}` : ""}`, {
          method: "DELETE",
        });
        if (response.ok) success++;
      } catch {
        // ignore
      }
    }

    setBulkLoading(false);
    setSelectedIds(new Set());
    toast.success(`Cancelled ${success} trucks`);
    onBulkAction?.();
  };

  const handleStartEditDate = (truck: Truck) => {
    if (!truck.permit_date) return;
    const date = new Date(truck.permit_date);
    setEditDateValue(format(date, "yyyy-MM-dd"));
    setEditTimeValue(format(date, "HH:mm"));
    setEditingDateId(truck.id);
  };

  const handleSaveDate = async (truckId: number) => {
    try {
      const dateTime = `${editDateValue} ${editTimeValue}:00`;
      const response = await fetch(`/api/trucks?id=${truckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          permit_date: dateTime,
        }),
      });
      if (response.ok) {
        toast.success("Permit date updated");
        setEditingDateId(null);
        onBulkAction?.();
      } else {
        toast.error("Failed to update date");
      }
    } catch {
      toast.error("Failed to update date");
    }
  };

  const handleCancelEditDate = () => {
    setEditingDateId(null);
    setEditDateValue("");
    setEditTimeValue("");
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            size="sm"
            onClick={handleBulkGenerate}
            disabled={bulkLoading || selectedPendingCount === 0}
          >
            <Stamp className="h-3 w-3 mr-1" />
            Generate All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkCancel}
            disabled={bulkLoading}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancel All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search truck, driver, or transporter..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="loaded">Loaded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="ago">AGO/DIESEL</SelectItem>
            <SelectItem value="pms">PMS/GASOLINE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={transporterFilter} onValueChange={(v) => { setTransporterFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by transporter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transporters</SelectItem>
            {transporters.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {paginatedTrucks.length} of {filteredTrucks.length} trucks
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={pendingTrucks.length > 0 && pendingTrucks.every(t => selectedIds.has(t.id))}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Truck/Trailer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty (L)</TableHead>
              <TableHead>Transporter</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permit Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrucks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No trucks found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrucks.map((truck, index) => (
                <TableRow key={truck.id} className={selectedIds.has(truck.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(truck.id)}
                      onCheckedChange={() => toggleSelect(truck.id)}
                      disabled={truck.status === "LOADED"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{truck.truck_trailer}</TableCell>
                  <TableCell>{getProductBadge(truck.product)}</TableCell>
                  <TableCell>{truck.quantity.toLocaleString()}</TableCell>
                  <TableCell>{truck.transporter}</TableCell>
                  <TableCell>{truck.driver_name}</TableCell>
                  <TableCell>{getStatusBadge(truck.status, truck.loaded)}</TableCell>
                  <TableCell className="text-sm">
                    {editingDateId === truck.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="h-7 w-28 text-xs"
                        />
                        <Input
                          type="time"
                          value={editTimeValue}
                          onChange={(e) => setEditTimeValue(e.target.value)}
                          className="h-7 w-20 text-xs"
                        />
                        <Button size="sm" className="h-7 px-2" onClick={() => handleSaveDate(truck.id)}>
                          ✓
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCancelEditDate}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={truck.permit_date ? "cursor-pointer hover:bg-muted px-1 py-0.5 rounded" : ""}
                        onDoubleClick={() => truck.permit_date && handleStartEditDate(truck)}
                        title={truck.permit_date ? "Double-click to edit" : ""}
                      >
                        {truck.permit_date ? format(new Date(truck.permit_date), "dd/MM/yy HH:mm") : "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(!truck.status || truck.status === "") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onGeneratePermit(truck)}
                          className="h-8"
                        >
                          <Stamp className="h-3 w-3 mr-1" />
                          Generate
                        </Button>
                      )}
                      {truck.status === "GENERATED" && !truck.loaded && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMarkLoaded(truck)}
                          className="h-8"
                        >
                          <TruckIcon className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                      )}
                      {truck.loaded === 1 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          BOL: {truck.bol_no}
                        </span>
                      )}
                      {truck.status !== "CANCELLED" && truck.status !== "LOADED" && onCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancel(truck)}
                          className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {truck.status === "CANCELLED" && (
                        <span className="text-xs text-red-500 px-2 py-1">
                          Vol returned
                        </span>
                      )}
                      {truck.status === "CANCELLED" && onRestore && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRestore(truck)}
                          className="h-8 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      )}
                      {onEdit && (!truck.status || truck.status === "") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(truck)}
                          className="h-8"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

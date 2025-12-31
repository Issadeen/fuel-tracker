"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Truck as TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { Truck } from "@/lib/types";
import { format } from "date-fns";

interface LoadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  onComplete: () => void;
  companyId?: number;
}

export function LoadingDialog({ 
  open, 
  onOpenChange, 
  truck, 
  onComplete,
  companyId 
}: LoadingDialogProps) {
  const [at20, setAt20] = useState("");
  const [loCompany, setLoCompany] = useState("");
  const [loadingDate, setLoadingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bolNo, setBolNo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!truck) return;

    if (!at20 || !loCompany || !loadingDate || !bolNo) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/trucks/loading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId: truck.id,
          at20: parseFloat(at20),
          loCompany,
          loadingDate,
          bolNo,
          companyId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success("Loading details saved successfully");
      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Loading error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save loading details");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAt20("");
    setLoCompany("");
    setLoadingDate(format(new Date(), "yyyy-MM-dd"));
    setBolNo("");
  };

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Mark as Loaded
          </DialogTitle>
          <DialogDescription>
            Enter loading details for {truck.truck_trailer}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
            <p><span className="font-medium">Product:</span> {truck.product}</p>
            <p><span className="font-medium">Quantity:</span> {truck.quantity.toLocaleString()}L</p>
            <p><span className="font-medium">Permit:</span> {truck.permit_no || 'N/A'}</p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="at20">AT20 (Temperature Reading)</Label>
            <Input
              id="at20"
              type="number"
              step="0.01"
              value={at20}
              onChange={(e) => setAt20(e.target.value)}
              placeholder="e.g. 20.5"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loCompany">Loading Company (LO)</Label>
            <Input
              id="loCompany"
              value={loCompany}
              onChange={(e) => setLoCompany(e.target.value)}
              placeholder="Enter loading company..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loadingDate">Loading Date</Label>
            <Input
              id="loadingDate"
              type="date"
              value={loadingDate}
              onChange={(e) => setLoadingDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bolNo">BOL Number</Label>
            <Input
              id="bolNo"
              value={bolNo}
              onChange={(e) => setBolNo(e.target.value)}
              placeholder="Enter BOL number..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <TruckIcon className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Loading"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

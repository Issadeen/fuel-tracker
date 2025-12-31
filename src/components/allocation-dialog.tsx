"use client";

import { useState, useEffect } from "react";
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
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Allocation } from "@/lib/types";

interface AllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  companyId?: number;
}

export function AllocationDialog({ 
  open, 
  onOpenChange, 
  onComplete,
  companyId 
}: AllocationDialogProps) {
  const [agoAllocation, setAgoAllocation] = useState("");
  const [pmsAllocation, setPmsAllocation] = useState("");
  const [loading, setLoading] = useState(false);

  const companyQueryParam = companyId ? `?companyId=${companyId}` : "";

  useEffect(() => {
    if (open) {
      fetchAllocations();
    }
  }, [open]);

  const fetchAllocations = async () => {
    try {
      const response = await fetch(`/api/allocations${companyQueryParam}`);
      const data: Allocation[] = await response.json();
      
      const ago = data.find(a => a.product_type === "AGO");
      const pms = data.find(a => a.product_type === "PMS");
      
      if (ago) setAgoAllocation(ago.initial_volume.toString());
      if (pms) setPmsAllocation(pms.initial_volume.toString());
    } catch (error) {
      console.error("Failed to fetch allocations:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update AGO
      await fetch(`/api/allocations${companyQueryParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "AGO",
          initialVolume: parseFloat(agoAllocation) || 0,
        }),
      });

      // Update PMS
      await fetch(`/api/allocations${companyQueryParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "PMS",
          initialVolume: parseFloat(pmsAllocation) || 0,
        }),
      });

      toast.success("Allocations updated successfully");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save allocations:", error);
      toast.error("Failed to update allocations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Set Allocations
          </DialogTitle>
          <DialogDescription>
            Set the initial fuel allocations. When you generate permits, volumes will be deducted from these.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="agoAllocation">AGO/DIESEL Allocation (Liters)</Label>
            <Input
              id="agoAllocation"
              type="number"
              value={agoAllocation}
              onChange={(e) => setAgoAllocation(e.target.value)}
              placeholder="e.g. 500000"
            />
            <p className="text-xs text-muted-foreground">
              For AGO and DIESEL products
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pmsAllocation">PMS/GASOLINE Allocation (Liters)</Label>
            <Input
              id="pmsAllocation"
              type="number"
              value={pmsAllocation}
              onChange={(e) => setPmsAllocation(e.target.value)}
              placeholder="e.g. 500000"
            />
            <p className="text-xs text-muted-foreground">
              For PMS and GASOLINE products
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Settings className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Allocations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

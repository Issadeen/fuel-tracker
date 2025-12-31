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
import { Stamp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Truck } from "@/lib/types";
import { format } from "date-fns";

interface GeneratePermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  onComplete: () => void;
  companyId?: number;
}

export function GeneratePermitDialog({ 
  open, 
  onOpenChange, 
  truck, 
  onComplete,
  companyId 
}: GeneratePermitDialogProps) {
  const [permitNo, setPermitNo] = useState("");
  const [permitDate, setPermitDate] = useState("");
  const [permitTime, setPermitTime] = useState("");
  const [loading, setLoading] = useState(false);

  // Set default date/time when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      setPermitDate(format(now, "yyyy-MM-dd"));
      setPermitTime(format(now, "HH:mm"));
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!truck) return;

    setLoading(true);
    try {
      // Combine date and time
      const dateTime = `${permitDate} ${permitTime}:00`;
      
      const response = await fetch("/api/trucks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId: truck.id,
          permitNo,
          permitDate: dateTime,
          companyId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      toast.success(result.message);
      onComplete();
      onOpenChange(false);
      setPermitNo("");
    } catch (error) {
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate permit");
    } finally {
      setLoading(false);
    }
  };

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="h-5 w-5" />
            Generate Permit
          </DialogTitle>
          <DialogDescription>
            Generate permit for truck {truck.truck_trailer}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
            <p><span className="font-medium">Product:</span> {truck.product}</p>
            <p><span className="font-medium">Quantity:</span> {truck.quantity.toLocaleString()}L</p>
            <p><span className="font-medium">Transporter:</span> {truck.transporter}</p>
            <p><span className="font-medium">Driver:</span> {truck.driver_name}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="permitNo">Permit Number (Optional)</Label>
            <Input
              id="permitNo"
              value={permitNo}
              onChange={(e) => setPermitNo(e.target.value)}
              placeholder="Enter permit number..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="permitDate">Permit Date</Label>
              <Input
                id="permitDate"
                type="date"
                value={permitDate}
                onChange={(e) => setPermitDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="permitTime">Permit Time</Label>
              <Input
                id="permitTime"
                type="time"
                value={permitTime}
                onChange={(e) => setPermitTime(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Volume will be deducted from allocation.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            <Stamp className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate Permit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

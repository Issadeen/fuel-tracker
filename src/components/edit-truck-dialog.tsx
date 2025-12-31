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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Truck } from "@/lib/types";

interface EditTruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  onComplete: () => void;
  companyId?: number;
}

export function EditTruckDialog({ 
  open, 
  onOpenChange, 
  truck, 
  onComplete,
  companyId 
}: EditTruckDialogProps) {
  const [formData, setFormData] = useState({
    truck_trailer: "",
    product: "",
    transporter: "",
    quantity: 0,
    driver_name: "",
    id_number: "",
    phone_number: "",
    destination: "",
    loading_point: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (truck) {
      setFormData({
        truck_trailer: truck.truck_trailer,
        product: truck.product,
        transporter: truck.transporter,
        quantity: truck.quantity,
        driver_name: truck.driver_name,
        id_number: truck.id_number,
        phone_number: truck.phone_number,
        destination: truck.destination,
        loading_point: truck.loading_point,
      });
    }
  }, [truck]);

  const handleSave = async () => {
    if (!truck) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/trucks?id=${truck.id}${companyId ? `&companyId=${companyId}` : ""}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success("Truck updated successfully");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update truck");
    } finally {
      setLoading(false);
    }
  };

  if (!truck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Truck
          </DialogTitle>
          <DialogDescription>
            Edit details for {truck.truck_trailer}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="truck_trailer">Truck/Trailer</Label>
              <Input
                id="truck_trailer"
                value={formData.truck_trailer}
                onChange={(e) => setFormData({ ...formData, truck_trailer: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Product</Label>
              <Select 
                value={formData.product} 
                onValueChange={(v) => setFormData({ ...formData, product: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGO">AGO</SelectItem>
                  <SelectItem value="PMS">PMS</SelectItem>
                  <SelectItem value="DIESEL">DIESEL</SelectItem>
                  <SelectItem value="GASOLINE">GASOLINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity (L)</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transporter">Transporter</Label>
              <Input
                id="transporter"
                value={formData.transporter}
                onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="driver_name">Driver Name</Label>
              <Input
                id="driver_name"
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="loading_point">Loading Point</Label>
            <Input
              id="loading_point"
              value={formData.loading_point}
              onChange={(e) => setFormData({ ...formData, loading_point: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Pencil className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

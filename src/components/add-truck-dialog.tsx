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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddTruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  companyId?: number;
}

export function AddTruckDialog({ 
  open, 
  onOpenChange, 
  onComplete,
  companyId 
}: AddTruckDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    truck_trailer: "",
    product: "AGO",
    quantity: "",
    transporter: "",
    driver_name: "",
    id_number: "",
    phone_number: "",
    destination: "",
    loading_point: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      truck_trailer: "",
      product: "AGO",
      quantity: "",
      transporter: "",
      driver_name: "",
      id_number: "",
      phone_number: "",
      destination: "",
      loading_point: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.truck_trailer) {
      toast.error("Truck/Trailer number is required");
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Valid quantity is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/trucks?companyId=${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add truck");
      }

      toast.success(`Truck ${formData.truck_trailer} added successfully`);
      resetForm();
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Add truck error:", error);
      toast.error("Failed to add truck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Truck
          </DialogTitle>
          <DialogDescription>
            Manually add a truck to the system
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="truck_trailer">Truck/Trailer No. *</Label>
              <Input
                id="truck_trailer"
                value={formData.truck_trailer}
                onChange={(e) => handleChange("truck_trailer", e.target.value)}
                placeholder="e.g. KBZ 123A/ZC 456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={formData.product} onValueChange={(v) => handleChange("product", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                  <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity (Litres) *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                placeholder="e.g. 36000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transporter">Transporter</Label>
              <Input
                id="transporter"
                value={formData.transporter}
                onChange={(e) => handleChange("transporter", e.target.value)}
                placeholder="e.g. ABC Transport"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="driver_name">Driver Name</Label>
              <Input
                id="driver_name"
                value={formData.driver_name}
                onChange={(e) => handleChange("driver_name", e.target.value)}
                placeholder="Driver's full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => handleChange("id_number", e.target.value)}
                placeholder="Driver's ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="e.g. 0712345678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
                placeholder="Delivery destination"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loading_point">Loading Point</Label>
            <Input
              id="loading_point"
              value={formData.loading_point}
              onChange={(e) => handleChange("loading_point", e.target.value)}
              placeholder="e.g. Mombasa"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Adding..." : "Add Truck"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

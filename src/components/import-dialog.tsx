"use client";

import { useState, useCallback } from "react";
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
import { Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  companyId?: number;
}

export function ImportDialog({ open, onOpenChange, onImportComplete, companyId }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processExcel = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      // Map Excel columns to our format (note: some columns have trailing spaces)
      const trucks = jsonData.map((row) => ({
        truck_trailer: row["Truck/Trailer"] || "",
        product: row["PRODUCT "] || row["PRODUCT"] || "",
        transporter: row["Transporter"] || "",
        quantity: row["Qty obs"] || 0,
        driver_name: row["Driver's Name"] || "",
        id_number: String(row["Id Number/Passport"] || ""),
        phone_number: String(row["Phone Number"] || ""),
        destination: row["Destination"] || "",
        loading_point: row["LOADING POINT "] || row["LOADING POINT"] || "",
      }));

      const response = await fetch(`/api/trucks${companyId ? `?companyId=${companyId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trucks),
      });

      if (!response.ok) throw new Error("Failed to import");

      const result = await response.json();
      toast.success(`Successfully imported ${result.count} trucks`);
      onImportComplete();
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import Excel file");
    } finally {
      setLoading(false);
    }
  }, [file, onImportComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Excel File
          </DialogTitle>
          <DialogDescription>
            Upload your Crawford List Excel file. All existing data will be replaced.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Excel File (.xlsx)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={processExcel} disabled={!file || loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

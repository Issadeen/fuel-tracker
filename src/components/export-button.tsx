"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Truck } from "@/lib/types";
import { toast } from "sonner";

interface ExportButtonProps {
  trucks: Truck[];
  filter: "all" | "generated" | "loaded";
}

export function ExportButton({ trucks, filter }: ExportButtonProps) {
  const handleExport = () => {
    let filteredTrucks = trucks;
    let filename = "trucks-all";

    if (filter === "generated") {
      filteredTrucks = trucks.filter(t => t.status === "GENERATED" || t.status === "LOADED");
      filename = "trucks-generated";
    } else if (filter === "loaded") {
      filteredTrucks = trucks.filter(t => t.status === "LOADED");
      filename = "trucks-loaded";
    }

    if (filteredTrucks.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = filteredTrucks.map(t => ({
      "Truck/Trailer": t.truck_trailer,
      "Product": t.product,
      "Quantity (L)": t.quantity,
      "Transporter": t.transporter,
      "Driver Name": t.driver_name,
      "ID Number": t.id_number,
      "Phone": t.phone_number,
      "Destination": t.destination,
      "Loading Point": t.loading_point,
      "Status": t.status || "PENDING",
      "Permit No": t.permit_no || "",
      "Permit Date": t.permit_date || "",
      "Loaded": t.loaded ? "Yes" : "No",
      "AT20": t.at20 || "",
      "LO Company": t.lo_company || "",
      "Loading Date": t.loading_date || "",
      "BOL No": t.bol_no || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trucks");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${filteredTrucks.length} trucks`);
  };

  const getLabel = () => {
    switch (filter) {
      case "generated": return "Export Generated";
      case "loaded": return "Export Loaded";
      default: return "Export All";
    }
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {getLabel()}
    </Button>
  );
}

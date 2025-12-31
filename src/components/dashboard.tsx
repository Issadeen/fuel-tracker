"use client";

import { useState, useEffect, useCallback } from "react";
import { Fuel, Upload, Settings, FileSpreadsheet, ClipboardList, Download, UploadCloud, Loader2, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsCards } from "@/components/stats-cards";
import { TrucksTable } from "@/components/trucks-table";
import { ImportDialog } from "@/components/import-dialog";
import { GeneratePermitDialog } from "@/components/generate-permit-dialog";
import { LoadingDialog } from "@/components/loading-dialog";
import { AllocationDialog } from "@/components/allocation-dialog";
import { ExportButton } from "@/components/export-button";
import { EditTruckDialog } from "@/components/edit-truck-dialog";
import { AuditLogDialog } from "@/components/audit-log-dialog";
import { AddTruckDialog } from "@/components/add-truck-dialog";
import { CompanySwitcher } from "@/components/company-switcher";
import { Truck, Allocation, TruckStats, Company } from "@/lib/types";

interface DashboardProps {
  companyId?: number;
  companyName?: string;
  isManager?: boolean;
}

export default function Dashboard({ companyId, companyName, isManager = false }: DashboardProps) {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [stats, setStats] = useState<TruckStats>({
    total: 0,
    generated: 0,
    loaded: 0,
    pending: 0,
    cancelled: 0,
    agoGenerated: 0,
    pmsGenerated: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(companyId);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Dialog states
  const [importOpen, setImportOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [addTruckOpen, setAddTruckOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);

  const companyQueryParam = selectedCompanyId ? `?companyId=${selectedCompanyId}` : "";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [trucksRes, allocationsRes, statsRes] = await Promise.all([
        fetch(`/api/trucks${companyQueryParam}`),
        fetch(`/api/allocations${companyQueryParam}`),
        fetch(`/api/stats${companyQueryParam}`),
      ]);

      const trucksData = await trucksRes.json();
      const allocationsData = await allocationsRes.json();
      const statsData = await statsRes.json();

      setTrucks(Array.isArray(trucksData) ? trucksData : []);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [companyQueryParam]);

  const fetchCompanies = useCallback(async () => {
    if (isManager) return; // Managers don't need company list
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, [fetchData, fetchCompanies]);

  const handleCompanyChange = (newCompanyId: number | undefined) => {
    setSelectedCompanyId(newCompanyId);
  };

  const handleGeneratePermit = (truck: Truck) => {
    setSelectedTruck(truck);
    setGenerateOpen(true);
  };

  const handleMarkLoaded = (truck: Truck) => {
    setSelectedTruck(truck);
    setLoadingOpen(true);
  };

  const handleCancel = async (truck: Truck) => {
    if (!confirm(`Cancel truck ${truck.truck_trailer}? Volume will be returned to allocation.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/trucks?id=${truck.id}&action=cancel${selectedCompanyId ? `&companyId=${selectedCompanyId}` : ""}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel");
      toast.success(`Truck ${truck.truck_trailer} cancelled. Volume returned.`);
      fetchData();
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel truck");
    }
  };

  const handleEdit = (truck: Truck) => {
    setSelectedTruck(truck);
    setEditOpen(true);
  };

  const handleRestore = async (truck: Truck) => {
    if (!confirm(`Restore truck ${truck.truck_trailer}? Volume will be deducted from allocation again.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/trucks?id=${truck.id}&action=restore${selectedCompanyId ? `&companyId=${selectedCompanyId}` : ""}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to restore");
      toast.success(`Truck ${truck.truck_trailer} restored.`);
      fetchData();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Failed to restore truck");
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch(`/api/backup${companyQueryParam}`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fuel-tracker-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to create backup");
    }
  };

  const handleRestoreBackup = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!confirm(`Restore ${data.trucks?.length || 0} trucks from backup? This will replace current data.`)) {
          return;
        }
        
        const response = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, companyId: selectedCompanyId }),
        });
        
        if (!response.ok) throw new Error("Failed to restore");
        toast.success("Backup restored successfully");
        fetchData();
      } catch (error) {
        console.error("Restore error:", error);
        toast.error("Failed to restore backup");
      }
    };
    input.click();
  };

  const currentCompanyName = companyName || companies.find(c => c.id === selectedCompanyId)?.name || "All Companies";
  const needsCompanySelection = !isManager && !selectedCompanyId;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />
      
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Fuel className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Fuel Tracker</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {currentCompanyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Company Switcher - Only for admin */}
              {!isManager && (
                <CompanySwitcher 
                  companies={companies} 
                  selectedCompanyId={selectedCompanyId}
                  onCompanyChange={handleCompanyChange}
                  onCompaniesUpdate={fetchCompanies}
                />
              )}
              <Button variant="outline" size="icon" onClick={handleBackup} title="Backup" disabled={needsCompanySelection}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRestoreBackup} title="Restore Backup" disabled={needsCompanySelection}>
                <UploadCloud className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setAuditOpen(true)} title="Audit Log" disabled={needsCompanySelection}>
                <ClipboardList className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setAllocationOpen(true)} disabled={needsCompanySelection}>
                <Settings className="mr-2 h-4 w-4" />
                Allocations
              </Button>
              <Button variant="outline" onClick={() => setAddTruckOpen(true)} disabled={needsCompanySelection}>
                <Plus className="mr-2 h-4 w-4" />
                Add Truck
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} disabled={needsCompanySelection}>
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Company Selection Prompt */}
          {needsCompanySelection && (
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-4 py-6">
                <Building2 className="h-10 w-10 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-lg">Please Select a Company</h3>
                  <p className="text-muted-foreground">
                    Use the company switcher in the header to select or create a company before managing trucks and allocations.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <StatsCards stats={stats} allocations={allocations} />

          {/* Trucks Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Trucks Management
                  </CardTitle>
                  <CardDescription>
                    Manage truck permits and loading operations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <ExportButton trucks={trucks} filter="generated" />
                  <ExportButton trucks={trucks} filter="loaded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">
                    All ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({stats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="generated">
                    Generated ({stats.generated - stats.loaded})
                  </TabsTrigger>
                  <TabsTrigger value="loaded">
                    Loaded ({stats.loaded})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled">
                    Cancelled ({stats.cancelled})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <TrucksTable 
                      trucks={trucks}
                      onGeneratePermit={handleGeneratePermit}
                      onMarkLoaded={handleMarkLoaded}
                      onCancel={handleCancel}
                      onEdit={handleEdit}
                      onRestore={handleRestore}
                      onBulkAction={fetchData}
                      companyId={selectedCompanyId}
                    />
                  )}
                </TabsContent>

                <TabsContent value="pending">
                  <TrucksTable 
                    trucks={trucks.filter(t => !t.status || t.status === "")}
                    onGeneratePermit={handleGeneratePermit}
                    onMarkLoaded={handleMarkLoaded}
                    onCancel={handleCancel}
                    onEdit={handleEdit}
                    onRestore={handleRestore}
                    onBulkAction={fetchData}
                    companyId={selectedCompanyId}
                  />
                </TabsContent>

                <TabsContent value="generated">
                  <TrucksTable 
                    trucks={trucks.filter(t => t.status === "GENERATED" && !t.loaded)}
                    onGeneratePermit={handleGeneratePermit}
                    onMarkLoaded={handleMarkLoaded}
                    onCancel={handleCancel}
                    onEdit={handleEdit}
                    onRestore={handleRestore}
                    onBulkAction={fetchData}
                    companyId={selectedCompanyId}
                  />
                </TabsContent>

                <TabsContent value="loaded">
                  <TrucksTable 
                    trucks={trucks.filter(t => t.status === "LOADED")}
                    onGeneratePermit={handleGeneratePermit}
                    onMarkLoaded={handleMarkLoaded}
                    onCancel={handleCancel}
                    onEdit={handleEdit}
                    onRestore={handleRestore}
                    onBulkAction={fetchData}
                    companyId={selectedCompanyId}
                  />
                </TabsContent>

                <TabsContent value="cancelled">
                  <TrucksTable 
                    trucks={trucks.filter(t => t.status === "CANCELLED")}
                    onGeneratePermit={handleGeneratePermit}
                    onMarkLoaded={handleMarkLoaded}
                    onCancel={handleCancel}
                    onEdit={handleEdit}
                    onRestore={handleRestore}
                    onBulkAction={fetchData}
                    companyId={selectedCompanyId}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs */}
      <ImportDialog 
        open={importOpen} 
        onOpenChange={setImportOpen}
        onImportComplete={fetchData}
        companyId={selectedCompanyId}
      />
      <AllocationDialog 
        open={allocationOpen} 
        onOpenChange={setAllocationOpen}
        onComplete={fetchData}
        companyId={selectedCompanyId}
      />
      <GeneratePermitDialog 
        open={generateOpen} 
        onOpenChange={setGenerateOpen}
        truck={selectedTruck}
        onComplete={fetchData}
        companyId={selectedCompanyId}
      />
      <LoadingDialog 
        open={loadingOpen} 
        onOpenChange={setLoadingOpen}
        truck={selectedTruck}
        onComplete={fetchData}
        companyId={selectedCompanyId}
      />
      <EditTruckDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        truck={selectedTruck}
        onComplete={fetchData}
        companyId={selectedCompanyId}
      />
      <AuditLogDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        companyId={selectedCompanyId}
      />
      <AddTruckDialog
        open={addTruckOpen}
        onOpenChange={setAddTruckOpen}
        onComplete={fetchData}
        companyId={selectedCompanyId}
      />
    </div>
  );
}

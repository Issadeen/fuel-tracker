"use client";

import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Company } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanySwitcherProps {
  companies: Company[];
  selectedCompanyId?: number;
  onCompanyChange: (companyId: number | undefined) => void;
  onCompaniesUpdate: () => void;
}

export function CompanySwitcher({ 
  companies, 
  selectedCompanyId, 
  onCompanyChange,
  onCompaniesUpdate 
}: CompanySwitcherProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectChange = (value: string) => {
    if (value === "all") {
      onCompanyChange(undefined);
    } else if (value === "manage") {
      setManageOpen(true);
    } else {
      onCompanyChange(parseInt(value));
    }
  };

  const handleCreateCompany = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create company");
      }

      toast.success("Company created successfully");
      setFormData({ name: "", slug: "" });
      onCompaniesUpdate();
    } catch (error) {
      console.error("Create company error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create company");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCompany.id, ...formData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update company");
      }

      toast.success("Company updated successfully");
      setEditingCompany(null);
      setFormData({ name: "", slug: "" });
      onCompaniesUpdate();
    } catch (error) {
      console.error("Update company error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update company");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Delete ${company.name}? This will also delete all trucks and allocations for this company.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/companies?id=${company.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete company");

      toast.success("Company deleted successfully");
      if (selectedCompanyId === company.id) {
        onCompanyChange(undefined);
      }
      onCompaniesUpdate();
    } catch (error) {
      console.error("Delete company error:", error);
      toast.error("Failed to delete company");
    }
  };

  const startEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({ name: company.name, slug: company.slug });
  };

  const cancelEdit = () => {
    setEditingCompany(null);
    setFormData({ name: "", slug: "" });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  // Filter out system admin company from user-facing list
  const userCompanies = companies.filter(c => !c.is_admin);

  return (
    <>
      <Select 
        value={selectedCompanyId?.toString() || "all"} 
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="w-[200px]">
          <Building2 className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {userCompanies.map((company) => (
            <SelectItem key={company.id} value={company.id.toString()}>
              {company.name}
            </SelectItem>
          ))}
          <SelectItem value="manage" className="text-primary font-medium">
            <Plus className="h-4 w-4 inline mr-1" />
            Manage Companies...
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Companies</DialogTitle>
            <DialogDescription>
              Add, edit, or remove companies. Each company gets a unique URL for their managers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Company List */}
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {userCompanies.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No companies yet. Add one below.
                </div>
              ) : (
                userCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">
                        URL: /c/{company.slug}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(company)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCompany(company)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add/Edit Form */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">
                {editingCompany ? "Edit Company" : "Add New Company"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        name,
                        slug: editingCompany ? formData.slug : generateSlug(name),
                      });
                    }}
                    placeholder="e.g., Crawford Transport"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-slug">URL Slug</Label>
                  <Input
                    id="company-slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="e.g., crawford"
                  />
                  {formData.slug && (
                    <p className="text-xs text-muted-foreground">
                      Manager URL: /c/{formData.slug}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editingCompany ? (
                  <>
                    <Button onClick={handleUpdateCompany} disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleCreateCompany} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isLoading ? "Adding..." : "Add Company"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

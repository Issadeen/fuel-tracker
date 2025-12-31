"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { AuditLog } from "@/lib/types";

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: number;
}

export function AuditLogDialog({ open, onOpenChange, companyId }: AuditLogDialogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audit${companyId ? `?companyId=${companyId}` : ""}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      GENERATE_PERMIT: "bg-blue-500",
      LOADING: "bg-green-500",
      CANCEL: "bg-red-500",
      RESTORE: "bg-purple-500",
      DELETE: "bg-red-700",
      UPDATE: "bg-yellow-500",
      IMPORT: "bg-cyan-500",
      BACKUP: "bg-gray-500",
      RESTORE_BACKUP: "bg-orange-500",
      ALLOCATION: "bg-indigo-500",
    };
    return (
      <Badge className={`${colors[action] || "bg-gray-500"} text-white`}>
        {action}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            Recent system activity and changes
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          <div className="pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activity logged yet
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 space-y-1 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss")}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-muted-foreground"> #{log.entity_id}</span>
                    )}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground break-words">
                      {log.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

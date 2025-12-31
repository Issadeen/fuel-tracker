"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Truck, FileCheck, Clock, Droplets, Flame, AlertTriangle } from "lucide-react";
import { TruckStats, Allocation } from "@/lib/types";

interface StatsCardsProps {
  stats: TruckStats;
  allocations: Allocation[];
}

export function StatsCards({ stats, allocations }: StatsCardsProps) {
  const ago = allocations.find(a => a.product_type === "AGO");
  const pms = allocations.find(a => a.product_type === "PMS");

  // Safe stats with defaults
  const safeStats = {
    total: stats?.total ?? 0,
    generated: stats?.generated ?? 0,
    loaded: stats?.loaded ?? 0,
    pending: stats?.pending ?? 0,
    cancelled: stats?.cancelled ?? 0,
    agoGenerated: stats?.agoGenerated ?? 0,
    pmsGenerated: stats?.pmsGenerated ?? 0,
  };

  // Low allocation warning thresholds (20% or less)
  const agoLow = ago && ago.initial_volume > 0 && (ago.remaining_volume / ago.initial_volume) <= 0.2;
  const pmsLow = pms && pms.initial_volume > 0 && (pms.remaining_volume / pms.initial_volume) <= 0.2;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.total}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.pending} pending
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Generated</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.generated}</div>
          <p className="text-xs text-muted-foreground">
            permits generated
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loaded</CardTitle>
          <Fuel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.loaded}</div>
          <p className="text-xs text-muted-foreground">
            trucks loaded
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.pending}</div>
          <p className="text-xs text-muted-foreground">
            awaiting permit
          </p>
        </CardContent>
      </Card>

      {/* Allocation Cards */}
      <Card className={`md:col-span-2 bg-gradient-to-br ${agoLow ? 'from-red-500/20 to-orange-500/20 border-red-500/40' : 'from-amber-500/10 to-orange-500/10 border-amber-500/20'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            AGO/DIESEL Balance
            {agoLow && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
          </CardTitle>
          <Droplets className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${agoLow ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {(ago?.remaining_volume || 0).toLocaleString()}L
          </div>
          {agoLow && (
            <p className="text-xs text-red-500 font-medium mt-1">Low allocation warning!</p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Initial: {(ago?.initial_volume || 0).toLocaleString()}L</span>
            <span>Used: {safeStats.agoGenerated.toLocaleString()}L</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className={`${agoLow ? 'bg-red-500' : 'bg-amber-500'} h-2 rounded-full transition-all`}
              style={{ 
                width: `${ago?.initial_volume ? Math.max(0, (ago.remaining_volume / ago.initial_volume) * 100) : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={`md:col-span-2 bg-gradient-to-br ${pmsLow ? 'from-red-500/20 to-orange-500/20 border-red-500/40' : 'from-green-500/10 to-emerald-500/10 border-green-500/20'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            PMS/GASOLINE Balance
            {pmsLow && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
          </CardTitle>
          <Flame className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pmsLow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {(pms?.remaining_volume || 0).toLocaleString()}L
          </div>
          {pmsLow && (
            <p className="text-xs text-red-500 font-medium mt-1">Low allocation warning!</p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Initial: {(pms?.initial_volume || 0).toLocaleString()}L</span>
            <span>Used: {safeStats.pmsGenerated.toLocaleString()}L</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className={`${pmsLow ? 'bg-red-500' : 'bg-green-500'} h-2 rounded-full transition-all`}
              style={{ 
                width: `${pms?.initial_volume ? Math.max(0, (pms.remaining_volume / pms.initial_volume) * 100) : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

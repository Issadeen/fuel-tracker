import { NextRequest, NextResponse } from 'next/server';
import { getTruckById, updateTruckLoading, addAuditLog } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { truckId, at20, loCompany, loadingDate, bolNo, companyId } = body;
    
    const truck = getTruckById(truckId);
    if (!truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }
    
    if (truck.loaded) {
      return NextResponse.json({ error: 'Truck already marked as loaded' }, { status: 400 });
    }
    
    updateTruckLoading(truckId, at20, loCompany, loadingDate, bolNo);
    addAuditLog('LOADING', 'truck', truckId, `BOL: ${bolNo}, AT20: ${at20}L`, companyId ? parseInt(companyId) : undefined);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating loading:', error);
    return NextResponse.json({ error: 'Failed to update loading' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAllocations, updateAllocation, addAuditLog } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    const allocations = getAllocations(companyId ? parseInt(companyId) : undefined);
    return NextResponse.json(allocations);
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = parseInt(searchParams.get('companyId') || '1');
    
    const body = await request.json();
    const { productType, initialVolume } = body;
    
    updateAllocation(companyId, productType, initialVolume, initialVolume);
    addAuditLog('ALLOCATION', 'allocation', null, `Set ${productType} to ${initialVolume}L`, companyId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating allocation:', error);
    return NextResponse.json({ error: 'Failed to update allocation' }, { status: 500 });
  }
}

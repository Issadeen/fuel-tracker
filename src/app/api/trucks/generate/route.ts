import { NextRequest, NextResponse } from 'next/server';
import { getTruckById, updateTruckPermit, getProductCategory, deductFromAllocation, checkAllocationAvailable, addAuditLog } from '@/lib/db';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { truckId, permitNo, permitDate, companyId } = body;
    
    const truck = getTruckById(truckId);
    if (!truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }
    
    if (truck.status === 'GENERATED' || truck.status === 'LOADED') {
      return NextResponse.json({ error: 'Permit already generated' }, { status: 400 });
    }
    
    // Use truck's company_id if not provided
    const effectiveCompanyId = companyId ? parseInt(companyId) : truck.company_id;
    
    // Check if allocation is available
    const category = getProductCategory(truck.product);
    const availability = checkAllocationAvailable(effectiveCompanyId, category, truck.quantity);
    
    if (!availability.available) {
      return NextResponse.json({ 
        error: `Insufficient ${category} allocation. Available: ${availability.remaining.toLocaleString()}L, Required: ${truck.quantity.toLocaleString()}L` 
      }, { status: 400 });
    }
    
    // Use provided date or current date/time
    const finalPermitDate = permitDate || format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    
    // Deduct from allocation
    deductFromAllocation(effectiveCompanyId, category, truck.quantity);
    
    updateTruckPermit(truckId, permitNo || '', finalPermitDate);
    addAuditLog('GENERATE_PERMIT', 'truck', truckId, `Permit: ${permitNo || 'auto'}, Volume: ${truck.quantity}L ${category}`, effectiveCompanyId);
    
    return NextResponse.json({ 
      success: true, 
      permitDate: finalPermitDate,
      message: `Deducted ${truck.quantity.toLocaleString()}L from ${category} allocation`
    });
  } catch (error) {
    console.error('Error generating permit:', error);
    return NextResponse.json({ error: 'Failed to generate permit' }, { status: 500 });
  }
}

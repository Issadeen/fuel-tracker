import { NextRequest, NextResponse } from 'next/server';
import { getAllTrucks, insertTruck, clearAllTrucks, deleteTruck, cancelTruck, updateTruck, restoreTruck, addAuditLog, getTruckById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    const trucks = getAllTrucks(companyId ? parseInt(companyId) : undefined);
    return NextResponse.json(trucks);
  } catch (error) {
    console.error('Error fetching trucks:', error);
    return NextResponse.json({ error: 'Failed to fetch trucks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = parseInt(searchParams.get('companyId') || '1');
    const body = await request.json();
    
    // Handle bulk import
    if (Array.isArray(body)) {
      clearAllTrucks(companyId);
      for (const truck of body) {
        // Normalize volume: if < 100, multiply by 1000
        let quantity = parseFloat(truck.quantity) || 0;
        if (quantity < 100) {
          quantity = quantity * 1000;
        }
        
        insertTruck({
          company_id: companyId,
          truck_trailer: truck.truck_trailer || '',
          product: truck.product || '',
          transporter: truck.transporter || '',
          quantity: quantity,
          driver_name: truck.driver_name || '',
          id_number: truck.id_number || '',
          phone_number: truck.phone_number || '',
          destination: truck.destination || '',
          loading_point: truck.loading_point || '',
        }, companyId);
      }
      addAuditLog('IMPORT', 'truck', null, `Imported ${body.length} trucks from Excel`, companyId);
      return NextResponse.json({ success: true, count: body.length });
    }
    
    // Handle single insert
    let quantity = parseFloat(body.quantity) || 0;
    if (quantity < 100) {
      quantity = quantity * 1000;
    }
    
    const id = insertTruck({
      company_id: companyId,
      truck_trailer: body.truck_trailer || '',
      product: body.product || '',
      transporter: body.transporter || '',
      quantity: quantity,
      driver_name: body.driver_name || '',
      id_number: body.id_number || '',
      phone_number: body.phone_number || '',
      destination: body.destination || '',
      loading_point: body.loading_point || '',
    }, companyId);
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating truck:', error);
    return NextResponse.json({ error: 'Failed to create truck' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    const companyId = searchParams.get('companyId');
    
    if (id) {
      const truck = getTruckById(parseInt(id));
      const cId = truck?.company_id;
      
      if (action === 'cancel') {
        cancelTruck(parseInt(id));
        addAuditLog('CANCEL', 'truck', parseInt(id), 'Truck cancelled, volume returned', cId);
      } else if (action === 'restore') {
        restoreTruck(parseInt(id));
        addAuditLog('RESTORE', 'truck', parseInt(id), 'Cancelled truck restored', cId);
      } else {
        deleteTruck(parseInt(id));
        addAuditLog('DELETE', 'truck', parseInt(id), 'Truck deleted', cId);
      }
    } else if (companyId) {
      clearAllTrucks(parseInt(companyId));
      addAuditLog('CLEAR_ALL', 'truck', null, 'All trucks cleared', parseInt(companyId));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting truck:', error);
    return NextResponse.json({ error: 'Failed to delete truck' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    const truck = getTruckById(parseInt(id));
    updateTruck(parseInt(id), body);
    addAuditLog('UPDATE', 'truck', parseInt(id), `Updated: ${JSON.stringify(body)}`, truck?.company_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating truck:', error);
    return NextResponse.json({ error: 'Failed to update truck' }, { status: 500 });
  }
}

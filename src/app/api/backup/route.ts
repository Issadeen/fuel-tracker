import { NextRequest, NextResponse } from 'next/server';
import { getFullBackup, restoreFromBackup, addAuditLog } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    const backup = getFullBackup(companyId ? parseInt(companyId) : undefined);
    addAuditLog('BACKUP', 'system', null, 'Database backup created', companyId ? parseInt(companyId) : undefined);
    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;
    
    if (!body.trucks || !body.allocations) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }
    
    const cId = companyId ? parseInt(companyId) : 1;
    restoreFromBackup(cId, body);
    addAuditLog('RESTORE_BACKUP', 'system', null, `Restored ${body.trucks.length} trucks`, cId);
    
    return NextResponse.json({ success: true, trucksRestored: body.trucks.length });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}

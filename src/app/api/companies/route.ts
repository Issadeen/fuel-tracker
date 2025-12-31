import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies, getCompanyBySlug, createCompany, updateCompany, deleteCompany, addAuditLog } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (slug) {
      const company = getCompanyBySlug(slug);
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      return NextResponse.json(company);
    }
    
    const companies = getAllCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug } = body;
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }
    
    // Check if slug already exists
    const existing = getCompanyBySlug(slug);
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }
    
    const id = createCompany(name, slug);
    addAuditLog('CREATE_COMPANY', 'company', id, `Created company: ${name} (${slug})`);
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
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
    const { name, slug } = body;
    
    updateCompany(parseInt(id), name, slug);
    addAuditLog('UPDATE_COMPANY', 'company', parseInt(id), `Updated company: ${name}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    deleteCompany(parseInt(id));
    addAuditLog('DELETE_COMPANY', 'company', parseInt(id), 'Deleted company');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}

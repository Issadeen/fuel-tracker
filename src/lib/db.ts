import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'fuel-tracker.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    product_type TEXT NOT NULL,
    initial_volume REAL NOT NULL DEFAULT 0,
    remaining_volume REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, product_type)
  );

  CREATE TABLE IF NOT EXISTS trucks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    truck_trailer TEXT NOT NULL,
    product TEXT NOT NULL,
    transporter TEXT,
    quantity REAL NOT NULL,
    driver_name TEXT,
    id_number TEXT,
    phone_number TEXT,
    destination TEXT,
    loading_point TEXT,
    
    -- Status fields
    status TEXT DEFAULT '',
    permit_no TEXT,
    permit_date TEXT,
    
    -- Loading fields
    loaded INTEGER DEFAULT 0,
    at20 REAL,
    lo_company TEXT,
    loading_date TEXT,
    bol_no TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default admin company if not exists
  INSERT OR IGNORE INTO companies (id, name, slug, is_admin) VALUES (1, 'Admin', 'admin', 1);
`);

export interface Company {
  id: number;
  name: string;
  slug: string;
  is_admin: number;
  created_at: string;
}

export interface Truck {
  id: number;
  company_id: number;
  truck_trailer: string;
  product: string;
  transporter: string;
  quantity: number;
  driver_name: string;
  id_number: string;
  phone_number: string;
  destination: string;
  loading_point: string;
  status: string;
  permit_no: string;
  permit_date: string;
  loaded: number;
  at20: number | null;
  lo_company: string;
  loading_date: string;
  bol_no: string;
  created_at: string;
  updated_at: string;
}

export interface Allocation {
  id: number;
  company_id: number;
  product_type: string;
  initial_volume: number;
  remaining_volume: number;
  created_at: string;
  updated_at: string;
}

// Company operations
export function getAllCompanies(): Company[] {
  return db.prepare('SELECT * FROM companies ORDER BY is_admin DESC, name').all() as Company[];
}

export function getCompanyBySlug(slug: string): Company | undefined {
  return db.prepare('SELECT * FROM companies WHERE slug = ?').get(slug) as Company | undefined;
}

export function getCompanyById(id: number): Company | undefined {
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Company | undefined;
}

export function createCompany(name: string, slug: string): number {
  // Create company
  const result = db.prepare('INSERT INTO companies (name, slug) VALUES (?, ?)').run(name, slug);
  const companyId = result.lastInsertRowid as number;
  
  // Create default allocations for this company
  db.prepare('INSERT INTO allocations (company_id, product_type, initial_volume, remaining_volume) VALUES (?, ?, 0, 0)').run(companyId, 'AGO');
  db.prepare('INSERT INTO allocations (company_id, product_type, initial_volume, remaining_volume) VALUES (?, ?, 0, 0)').run(companyId, 'PMS');
  
  return companyId;
}

export function updateCompany(id: number, name: string, slug: string): void {
  db.prepare('UPDATE companies SET name = ?, slug = ? WHERE id = ?').run(name, slug, id);
}

export function deleteCompany(id: number): void {
  // Don't delete admin company
  const company = getCompanyById(id);
  if (company?.is_admin) return;
  
  // Delete all related data
  db.prepare('DELETE FROM trucks WHERE company_id = ?').run(id);
  db.prepare('DELETE FROM allocations WHERE company_id = ?').run(id);
  db.prepare('DELETE FROM audit_log WHERE company_id = ?').run(id);
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
}

// Truck operations - now scoped by company
export function getAllTrucks(companyId?: number): Truck[] {
  if (companyId) {
    return db.prepare('SELECT * FROM trucks WHERE company_id = ? ORDER BY id').all(companyId) as Truck[];
  }
  return db.prepare('SELECT * FROM trucks ORDER BY id').all() as Truck[];
}

export function getTruckById(id: number): Truck | undefined {
  return db.prepare('SELECT * FROM trucks WHERE id = ?').get(id) as Truck | undefined;
}

export function insertTruck(truck: Omit<Truck, 'id' | 'created_at' | 'updated_at' | 'status' | 'permit_no' | 'permit_date' | 'loaded' | 'at20' | 'lo_company' | 'loading_date' | 'bol_no'>, companyId: number = 1): number {
  const stmt = db.prepare(`
    INSERT INTO trucks (company_id, truck_trailer, product, transporter, quantity, driver_name, id_number, phone_number, destination, loading_point)
    VALUES (?, @truck_trailer, @product, @transporter, @quantity, @driver_name, @id_number, @phone_number, @destination, @loading_point)
  `);
  const result = stmt.run(companyId, truck);
  return result.lastInsertRowid as number;
}

export function updateTruckPermit(id: number, permitNo: string, permitDate: string): void {
  db.prepare(`
    UPDATE trucks SET permit_no = ?, permit_date = ?, status = 'GENERATED', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(permitNo, permitDate, id);
}

export function updateTruckLoading(id: number, at20: number, loCompany: string, loadingDate: string, bolNo: string): void {
  db.prepare(`
    UPDATE trucks SET loaded = 1, at20 = ?, lo_company = ?, loading_date = ?, bol_no = ?, status = 'LOADED', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(at20, loCompany, loadingDate, bolNo, id);
}

export function deleteTruck(id: number): void {
  db.prepare('DELETE FROM trucks WHERE id = ?').run(id);
}

export function cancelTruck(id: number): boolean {
  const truck = getTruckById(id);
  if (!truck) return false;
  
  // Return volume to allocation if permit was generated
  if (truck.status === 'GENERATED' || truck.status === 'LOADED') {
    const productType = getProductCategory(truck.product);
    const allocation = db.prepare('SELECT * FROM allocations WHERE company_id = ? AND product_type = ?').get(truck.company_id, productType) as Allocation;
    if (allocation) {
      const newRemaining = allocation.remaining_volume + truck.quantity;
      db.prepare(`
        UPDATE allocations SET remaining_volume = ?, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = ? AND product_type = ?
      `).run(newRemaining, truck.company_id, productType);
    }
  }
  
  // Update truck status to CANCELLED
  db.prepare(`
    UPDATE trucks SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  
  return true;
}

export function clearAllTrucks(companyId?: number): void {
  if (companyId) {
    db.prepare('DELETE FROM trucks WHERE company_id = ?').run(companyId);
  } else {
    db.prepare('DELETE FROM trucks').run();
  }
}

// Allocation operations - now scoped by company
export function getAllocations(companyId?: number): Allocation[] {
  if (companyId) {
    return db.prepare('SELECT * FROM allocations WHERE company_id = ?').all(companyId) as Allocation[];
  }
  return db.prepare('SELECT * FROM allocations').all() as Allocation[];
}

export function updateAllocation(companyId: number, productType: string, initialVolume: number, remainingVolume: number): void {
  // Use INSERT OR REPLACE to handle both new and existing allocations
  db.prepare(`
    INSERT INTO allocations (company_id, product_type, initial_volume, remaining_volume, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(company_id, product_type) DO UPDATE SET
      initial_volume = excluded.initial_volume,
      remaining_volume = excluded.remaining_volume,
      updated_at = CURRENT_TIMESTAMP
  `).run(companyId, productType, initialVolume, remainingVolume);
}

export function deductFromAllocation(companyId: number, productType: string, volume: number): boolean {
  const allocation = db.prepare('SELECT * FROM allocations WHERE company_id = ? AND product_type = ?').get(companyId, productType) as Allocation;
  if (!allocation) return false;
  
  const newRemaining = allocation.remaining_volume - volume;
  db.prepare(`
    UPDATE allocations SET remaining_volume = ?, updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND product_type = ?
  `).run(newRemaining, companyId, productType);
  
  return true;
}

export function getProductCategory(product: string): string {
  const normalized = product.toUpperCase();
  if (['AGO', 'DIESEL'].includes(normalized)) {
    return 'AGO';
  }
  return 'PMS'; // PMS, GASOLINE
}

// Statistics - now scoped by company
export function getTruckStats(companyId?: number) {
  const whereClause = companyId ? 'WHERE company_id = ?' : '';
  const whereClauseAnd = companyId ? 'AND company_id = ?' : '';
  const params = companyId ? [companyId] : [];
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM trucks ${whereClause}`).get(...params) as { count: number };
  const generated = db.prepare(`SELECT COUNT(*) as count FROM trucks WHERE (status = 'GENERATED' OR status = 'LOADED') ${companyId ? 'AND company_id = ?' : ''}`).get(...params) as { count: number };
  const loaded = db.prepare(`SELECT COUNT(*) as count FROM trucks WHERE status = 'LOADED' ${companyId ? 'AND company_id = ?' : ''}`).get(...params) as { count: number };
  const pending = db.prepare(`SELECT COUNT(*) as count FROM trucks WHERE (status = '' OR status IS NULL) ${companyId ? 'AND company_id = ?' : ''}`).get(...params) as { count: number };
  const cancelled = db.prepare(`SELECT COUNT(*) as count FROM trucks WHERE status = 'CANCELLED' ${companyId ? 'AND company_id = ?' : ''}`).get(...params) as { count: number };
  
  // Volume by product category
  const agoVolume = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total FROM trucks 
    WHERE UPPER(product) IN ('AGO', 'DIESEL') AND (status = 'GENERATED' OR status = 'LOADED') ${companyId ? 'AND company_id = ?' : ''}
  `).get(...params) as { total: number };
  
  const pmsVolume = db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as total FROM trucks 
    WHERE UPPER(product) IN ('PMS', 'GASOLINE') AND (status = 'GENERATED' OR status = 'LOADED') ${companyId ? 'AND company_id = ?' : ''}
  `).get(...params) as { total: number };

  return {
    total: total.count,
    generated: generated.count,
    loaded: loaded.count,
    pending: pending.count,
    cancelled: cancelled.count,
    agoGenerated: agoVolume.total,
    pmsGenerated: pmsVolume.total
  };
}

// Audit log operations - now scoped by company
export interface AuditLog {
  id: number;
  company_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

export function addAuditLog(action: string, entityType: string, entityId: number | null, details: string, companyId?: number): void {
  db.prepare(`
    INSERT INTO audit_log (company_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(companyId || null, action, entityType, entityId, details);
}

export function getAuditLogs(companyId?: number, limit: number = 100): AuditLog[] {
  if (companyId) {
    return db.prepare('SELECT * FROM audit_log WHERE company_id = ? OR company_id IS NULL ORDER BY id DESC LIMIT ?').all(companyId, limit) as AuditLog[];
  }
  return db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit) as AuditLog[];
}

// Update truck details
export function updateTruck(id: number, data: Partial<Omit<Truck, 'id' | 'created_at' | 'updated_at'>>): void {
  const fields = Object.keys(data).map(key => `${key} = @${key}`).join(', ');
  const stmt = db.prepare(`UPDATE trucks SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...data, id });
}

// Restore cancelled truck
export function restoreTruck(id: number): boolean {
  const truck = getTruckById(id);
  if (!truck || truck.status !== 'CANCELLED') return false;
  
  // Deduct from allocation again
  const productType = getProductCategory(truck.product);
  deductFromAllocation(truck.company_id, productType, truck.quantity);
  
  // Restore to GENERATED status (since it had a permit before)
  db.prepare(`
    UPDATE trucks SET status = 'GENERATED', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  
  return true;
}

// Check for duplicate trucks
export function checkDuplicateTrucks(companyId: number, truckTrailers: string[]): string[] {
  const existing = db.prepare('SELECT truck_trailer FROM trucks WHERE company_id = ? AND truck_trailer IN (' + truckTrailers.map(() => '?').join(',') + ')').all(companyId, ...truckTrailers) as { truck_trailer: string }[];
  return existing.map(t => t.truck_trailer);
}

// Check allocation availability
export function checkAllocationAvailable(companyId: number, productType: string, volume: number): { available: boolean; remaining: number } {
  const allocation = db.prepare('SELECT * FROM allocations WHERE company_id = ? AND product_type = ?').get(companyId, productType) as Allocation;
  if (!allocation) return { available: false, remaining: 0 };
  return { 
    available: allocation.remaining_volume >= volume, 
    remaining: allocation.remaining_volume 
  };
}

// Backup database - scoped by company
export function getFullBackup(companyId?: number): { trucks: Truck[]; allocations: Allocation[]; auditLogs: AuditLog[] } {
  return {
    trucks: getAllTrucks(companyId),
    allocations: getAllocations(companyId),
    auditLogs: getAuditLogs(companyId, 1000)
  };
}

// Restore from backup - scoped by company
export function restoreFromBackup(companyId: number, data: { trucks: Truck[]; allocations: Allocation[] }): void {
  db.prepare('DELETE FROM trucks WHERE company_id = ?').run(companyId);
  
  for (const truck of data.trucks) {
    db.prepare(`
      INSERT INTO trucks (company_id, truck_trailer, product, transporter, quantity, driver_name, id_number, phone_number, destination, loading_point, status, permit_no, permit_date, loaded, at20, lo_company, loading_date, bol_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId, truck.truck_trailer, truck.product, truck.transporter, truck.quantity,
      truck.driver_name, truck.id_number, truck.phone_number, truck.destination, truck.loading_point,
      truck.status, truck.permit_no, truck.permit_date, truck.loaded, truck.at20,
      truck.lo_company, truck.loading_date, truck.bol_no, truck.created_at, truck.updated_at
    );
  }
  
  for (const alloc of data.allocations) {
    db.prepare(`
      UPDATE allocations SET initial_volume = ?, remaining_volume = ?, updated_at = ?
      WHERE company_id = ? AND product_type = ?
    `).run(alloc.initial_volume, alloc.remaining_volume, alloc.updated_at, companyId, alloc.product_type);
  }
}

export default db;

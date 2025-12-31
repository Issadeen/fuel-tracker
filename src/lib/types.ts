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

export interface TruckStats {
  total: number;
  generated: number;
  loaded: number;
  pending: number;
  cancelled: number;
  agoGenerated: number;
  pmsGenerated: number;
}

export interface AuditLog {
  id: number;
  company_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

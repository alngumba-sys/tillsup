-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  business_id UUID NOT NULL,
  permissions JSONB, -- Array of permissions
  is_system_role BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create supplier_invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  business_id UUID NOT NULL,
  branch_id UUID,
  branch_name TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  purchase_order_id TEXT,
  purchase_order_number TEXT,
  grn_id TEXT,
  grn_number TEXT,
  items JSONB, -- Array of line items
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  invoice_date DATE,
  due_date DATE,
  status TEXT,
  notes TEXT,
  created_by_staff_id UUID,
  created_by_staff_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by_staff_id UUID,
  approved_by_staff_name TEXT,
  paid_at TIMESTAMPTZ,
  paid_by_staff_id UUID,
  paid_by_staff_name TEXT,
  linked_expense_id TEXT
);

-- Create inventory_audit_log table
CREATE TABLE IF NOT EXISTS inventory_audit_log (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL,
  branch_id UUID,
  branch_name TEXT,
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  action TEXT,
  quantity NUMERIC,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  source TEXT,
  source_reference_id TEXT,
  source_reference_number TEXT,
  performed_by_staff_id UUID,
  performed_by_staff_name TEXT,
  performed_by_role TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users
CREATE POLICY "Roles Policy" ON roles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Supplier Invoices Policy" ON supplier_invoices
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Inventory Audit Log Policy" ON inventory_audit_log
  FOR ALL USING (auth.role() = 'authenticated');

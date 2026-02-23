-- Create supplier_requests table
CREATE TABLE IF NOT EXISTS supplier_requests (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL,
  branch_id UUID,
  branch_name TEXT,
  product_id UUID,
  product_name TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  current_stock NUMERIC,
  requested_quantity NUMERIC,
  communication_methods JSONB, -- Storing array as JSONB
  custom_message TEXT,
  status TEXT,
  conversion_status TEXT,
  converted_to_po_id TEXT,
  converted_at TIMESTAMPTZ,
  converted_by_staff_id UUID,
  converted_by_staff_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_by_staff_id UUID,
  created_by_staff_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_via TEXT,
  timestamp TIMESTAMPTZ -- Legacy field mapping to created_at
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY, -- Custom ID format
  po_number TEXT,
  business_id UUID NOT NULL,
  branch_id UUID,
  branch_name TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  supplier_contact TEXT,
  items JSONB, -- Array of line items
  expected_delivery_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT,
  total_amount NUMERIC,
  source_request_id TEXT,
  created_by_staff_id UUID,
  created_by_staff_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  sent_via JSONB, -- Array of methods
  approved_at TIMESTAMPTZ,
  approved_by_staff_id UUID,
  approved_by_staff_name TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

-- Create goods_received_notes table
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id TEXT PRIMARY KEY, -- Custom ID format
  grn_number TEXT,
  business_id UUID NOT NULL,
  branch_id UUID,
  branch_name TEXT,
  purchase_order_id TEXT,
  purchase_order_number TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  items JSONB, -- Array of line items
  delivery_status TEXT,
  status TEXT,
  received_by_staff_id UUID,
  received_by_staff_name TEXT,
  received_by_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE supplier_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users
CREATE POLICY "Supplier Requests Policy" ON supplier_requests
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Purchase Orders Policy" ON purchase_orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Goods Received Notes Policy" ON goods_received_notes
  FOR ALL USING (auth.role() = 'authenticated');

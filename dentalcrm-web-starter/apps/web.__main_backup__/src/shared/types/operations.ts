export type Location = {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
};

export type Supplier = {
  id: number;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type InventorySummary = {
  items_count: number;
  low_stock_count: number;
  inventory_value_cents: number;
};

export type InventoryItem = {
  id: number;
  supplier_id?: number | null;
  location_id?: number | null;
  sku?: string | null;
  name: string;
  category: string;
  unit: string;
  stock_quantity: string | number;
  reorder_level: string | number;
  unit_cost_cents: number;
  valuation_method: 'average' | 'fifo' | 'lifo' | (string & {});
  is_active: boolean;
  supplier?: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
  };
};

export type StockMovement = {
  id: number;
  inventory_item_id: number;
  type: 'purchase' | 'consume' | 'adjustment' | 'return' | (string & {});
  quantity: string | number;
  unit_cost_cents: number;
  reference_type?: string | null;
  reference_id?: number | null;
  notes?: string | null;
  moved_at: string;
  item?: {
    id: number;
    name: string;
    unit: string;
  };
};

export type PurchaseOrder = {
  id: number;
  supplier_id?: number | null;
  number: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled' | (string & {});
  ordered_at?: string | null;
  expected_at?: string | null;
  total_cents: number;
  notes?: string | null;
  supplier?: {
    id: number;
    name: string;
  };
  items?: Array<{
    id: number;
    inventory_item_id?: number | null;
    description: string;
    quantity: string | number;
    unit_cost_cents: number;
    total_cents: number;
    inventoryItem?: {
      id: number;
      name: string;
    };
  }>;
};

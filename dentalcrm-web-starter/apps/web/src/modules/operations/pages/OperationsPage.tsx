import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/components/StatCard';
import {
  createInventoryItem,
  createLocation,
  createPurchaseOrder,
  createStockMovement,
  createSupplier,
  fetchInventoryItems,
  fetchInventorySummary,
  fetchLocations,
  fetchPurchaseOrders,
  fetchStockMovements,
  fetchSuppliers,
} from '@/shared/api/resources';
import type { InventoryItem, PurchaseOrder, StockMovement } from '@/shared/types/operations';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

type LocationFormState = {
  name: string;
  address: string;
  phone: string;
  email: string;
};

type SupplierFormState = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
};

type InventoryItemFormState = {
  name: string;
  category: string;
  unit: string;
  stock_quantity: string;
  reorder_level: string;
  unit_cost: string;
  supplier_id: string;
  location_id: string;
  valuation_method: InventoryItem['valuation_method'];
};

type StockMovementFormState = {
  inventory_item_id: string;
  type: StockMovement['type'];
  quantity: string;
  unit_cost: string;
  notes: string;
};

type PurchaseOrderLineForm = {
  inventory_item_id: string;
  description: string;
  quantity: string;
  unit_cost: string;
};

type PurchaseOrderFormState = {
  supplier_id: string;
  status: PurchaseOrder['status'];
  notes: string;
  items: PurchaseOrderLineForm[];
};

const emptyLocationForm = (): LocationFormState => ({ name: '', address: '', phone: '', email: '' });
const emptySupplierForm = (): SupplierFormState => ({ name: '', contact_name: '', email: '', phone: '', notes: '' });
const emptyInventoryItemForm = (): InventoryItemFormState => ({
  name: '',
  category: '',
  unit: 'uds',
  stock_quantity: '0',
  reorder_level: '0',
  unit_cost: '0',
  supplier_id: '',
  location_id: '',
  valuation_method: 'average',
});
const emptyStockMovementForm = (): StockMovementFormState => ({
  inventory_item_id: '',
  type: 'purchase',
  quantity: '1',
  unit_cost: '0',
  notes: '',
});
const emptyPurchaseOrderLine = (): PurchaseOrderLineForm => ({ inventory_item_id: '', description: '', quantity: '1', unit_cost: '0' });
const emptyPurchaseOrderForm = (): PurchaseOrderFormState => ({ supplier_id: '', status: 'ordered', notes: '', items: [emptyPurchaseOrderLine()] });

function parseMoney(value: string) {
  const normalized = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(normalized) && normalized > 0 ? Math.round(normalized * 100) : 0;
}

function parseDecimal(value: string) {
  const normalized = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function formatCurrency(valueCents: number) {
  return currencyFormatter.format(valueCents / 100);
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-ES') : '-';
}

function isLowStock(item: InventoryItem) {
  return Number(item.stock_quantity) <= Number(item.reorder_level);
}

function valuationMethodLabel(method: string) {
  switch (method) {
    case 'fifo':
      return 'Primero en entrar';
    case 'lifo':
      return 'Ultimo en entrar';
    default:
      return 'Coste medio';
  }
}

function movementTypeLabel(type: string) {
  switch (type) {
    case 'consume':
      return 'Consumo';
    case 'adjustment':
      return 'Ajuste';
    case 'return':
      return 'Devolucion';
    default:
      return 'Compra';
  }
}

function orderStatusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'received':
      return 'Recibido';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Pedido';
  }
}

export function OperationsPage() {
  const queryClient = useQueryClient();
  const [locationForm, setLocationForm] = useState<LocationFormState>(emptyLocationForm);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [inventoryItemForm, setInventoryItemForm] = useState<InventoryItemFormState>(emptyInventoryItemForm);
  const [stockMovementForm, setStockMovementForm] = useState<StockMovementFormState>(emptyStockMovementForm);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState<PurchaseOrderFormState>(emptyPurchaseOrderForm);

  const { data: locations = [] } = useQuery({
    queryKey: ['operations-locations'],
    queryFn: fetchLocations,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['operations-suppliers'],
    queryFn: fetchSuppliers,
  });

  const { data: inventorySummary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: fetchInventorySummary,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => fetchInventoryItems(),
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: fetchStockMovements,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
  });

  useEffect(() => {
    if (stockMovementForm.inventory_item_id || inventoryItems.length === 0) {
      return;
    }

    setStockMovementForm((previous) => ({
      ...previous,
      inventory_item_id: String(inventoryItems[0].id),
      unit_cost: (inventoryItems[0].unit_cost_cents / 100).toFixed(2),
    }));
  }, [inventoryItems, stockMovementForm.inventory_item_id]);

  const invalidateOperations = () => {
    queryClient.invalidateQueries({ queryKey: ['operations-locations'] });
    queryClient.invalidateQueries({ queryKey: ['operations-suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      invalidateOperations();
      setLocationForm(emptyLocationForm());
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      invalidateOperations();
      setSupplierForm(emptySupplierForm());
    },
  });

  const createInventoryItemMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      invalidateOperations();
      setInventoryItemForm(emptyInventoryItemForm());
    },
  });

  const createStockMovementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      invalidateOperations();
      setStockMovementForm((previous) => ({
        ...emptyStockMovementForm(),
        inventory_item_id: previous.inventory_item_id,
      }));
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      invalidateOperations();
      setPurchaseOrderForm(emptyPurchaseOrderForm());
    },
  });

  const lowStockItems = useMemo(
    () => inventoryItems.filter((item) => isLowStock(item)),
    [inventoryItems],
  );

  const handleInventoryItemSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createInventoryItemMutation.mutate({
      name: inventoryItemForm.name.trim(),
      category: inventoryItemForm.category.trim(),
      unit: inventoryItemForm.unit.trim(),
      stock_quantity: parseDecimal(inventoryItemForm.stock_quantity),
      reorder_level: parseDecimal(inventoryItemForm.reorder_level),
      unit_cost_cents: parseMoney(inventoryItemForm.unit_cost),
      supplier_id: inventoryItemForm.supplier_id ? Number(inventoryItemForm.supplier_id) : null,
      location_id: inventoryItemForm.location_id ? Number(inventoryItemForm.location_id) : null,
      valuation_method: inventoryItemForm.valuation_method,
      is_active: true,
    });
  };

  const handleStockMovementSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stockMovementForm.inventory_item_id) {
      return;
    }

    createStockMovementMutation.mutate({
      inventory_item_id: Number(stockMovementForm.inventory_item_id),
      type: stockMovementForm.type,
      quantity: parseDecimal(stockMovementForm.quantity),
      unit_cost_cents: parseMoney(stockMovementForm.unit_cost),
      notes: stockMovementForm.notes.trim() || null,
    });
  };

  const handlePurchaseOrderSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createPurchaseOrderMutation.mutate({
      supplier_id: purchaseOrderForm.supplier_id ? Number(purchaseOrderForm.supplier_id) : null,
      status: purchaseOrderForm.status,
      notes: purchaseOrderForm.notes.trim() || null,
      items: purchaseOrderForm.items.map((item) => ({
        inventory_item_id: item.inventory_item_id ? Number(item.inventory_item_id) : null,
        description: item.description.trim(),
        quantity: parseDecimal(item.quantity),
        unit_cost_cents: parseMoney(item.unit_cost),
      })),
    });
  };

  const updatePurchaseOrderLine = (index: number, patch: Partial<PurchaseOrderLineForm>) => {
    setPurchaseOrderForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Operativa</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Operaciones</h2>
        <p className="mt-2 text-sm text-slate-500">
          Control de centros, proveedores, stock y compras para que no falte material.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articulos"
          value={String(inventorySummary?.items_count ?? inventoryItems.length)}
          hint="Catalogo activo"
        />
        <StatCard
          label="Stock critico"
          value={String(inventorySummary?.low_stock_count ?? lowStockItems.length)}
          hint="Por debajo del minimo recomendado"
        />
        <StatCard
          label="Valor total"
          value={formatCurrency(inventorySummary?.inventory_value_cents ?? 0)}
          hint="Valoracion actual"
        />
        <StatCard label="Centros" value={String(locations.length)} hint="Espacios configurados" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createLocationMutation.mutate({
                name: locationForm.name.trim(),
                address: locationForm.address.trim() || null,
                phone: locationForm.phone.trim() || null,
                email: locationForm.email.trim() || null,
                is_active: true,
              });
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-950">Nuevo centro</h3>
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Nombre del centro</span>
                <input value={locationForm.name} onChange={(event) => setLocationForm((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Clinica Madrid Centro" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Direccion</span>
                <input value={locationForm.address} onChange={(event) => setLocationForm((previous) => ({ ...previous, address: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Calle Mayor 1, Madrid" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm text-slate-600">Telefono</span>
                  <input value={locationForm.phone} onChange={(event) => setLocationForm((previous) => ({ ...previous, phone: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="+34 91 000 00 00" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm text-slate-600">Email</span>
                  <input value={locationForm.email} onChange={(event) => setLocationForm((previous) => ({ ...previous, email: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="centro@clinica.com" />
                </label>
              </div>
            </div>
            <button type="submit" disabled={createLocationMutation.isPending || !locationForm.name.trim()} className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300">
              {createLocationMutation.isPending ? 'Guardando...' : 'Guardar centro'}
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              createSupplierMutation.mutate({
                name: supplierForm.name.trim(),
                contact_name: supplierForm.contact_name.trim() || null,
                email: supplierForm.email.trim() || null,
                phone: supplierForm.phone.trim() || null,
                notes: supplierForm.notes.trim() || null,
              });
            }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-950">Nuevo proveedor</h3>
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Nombre del proveedor</span>
                <input value={supplierForm.name} onChange={(event) => setSupplierForm((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Dental Supply SL" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Persona de contacto</span>
                <input value={supplierForm.contact_name} onChange={(event) => setSupplierForm((previous) => ({ ...previous, contact_name: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Juan Garcia" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm text-slate-600">Email</span>
                  <input value={supplierForm.email} onChange={(event) => setSupplierForm((previous) => ({ ...previous, email: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="pedidos@proveedor.com" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm text-slate-600">Telefono</span>
                  <input value={supplierForm.phone} onChange={(event) => setSupplierForm((previous) => ({ ...previous, phone: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="+34 91 000 00 00" />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Notas</span>
                <textarea value={supplierForm.notes} onChange={(event) => setSupplierForm((previous) => ({ ...previous, notes: event.target.value }))} className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Condiciones, SLA, observaciones" />
              </label>
            </div>
            <button type="submit" disabled={createSupplierMutation.isPending || !supplierForm.name.trim()} className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300">
              {createSupplierMutation.isPending ? 'Guardando...' : 'Crear proveedor'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleInventoryItemSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Nuevo articulo</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Nombre</span>
                <input value={inventoryItemForm.name} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Guantes de nitrilo" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Categoria</span>
                <input value={inventoryItemForm.category} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, category: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Fungibles, material clinico..." />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Unidad</span>
                <input value={inventoryItemForm.unit} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, unit: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="uds, caja, ml..." />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Metodo de valoracion</span>
                <select value={inventoryItemForm.valuation_method} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, valuation_method: event.target.value as InventoryItem['valuation_method'] }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="average">Coste medio</option>
                  <option value="fifo">Primero en entrar</option>
                  <option value="lifo">Ultimo en entrar</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Stock actual</span>
                <input type="number" min="0" step="0.1" value={inventoryItemForm.stock_quantity} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, stock_quantity: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="0" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Minimo recomendado</span>
                <input type="number" min="0" step="0.1" value={inventoryItemForm.reorder_level} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, reorder_level: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="0" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Coste unitario (€)</span>
                <input type="number" min="0" step="0.01" value={inventoryItemForm.unit_cost} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, unit_cost: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="0.00" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-slate-600">Sede</span>
                <select value={inventoryItemForm.location_id} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, location_id: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="">Sin sede asignada</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-sm text-slate-600">Proveedor principal</span>
                <select value={inventoryItemForm.supplier_id} onChange={(event) => setInventoryItemForm((previous) => ({ ...previous, supplier_id: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="">Sin proveedor principal</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" disabled={createInventoryItemMutation.isPending || !inventoryItemForm.name.trim() || !inventoryItemForm.category.trim()} className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300">
              {createInventoryItemMutation.isPending ? 'Guardando...' : 'Guardar articulo'}
            </button>
          </form>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handleStockMovementSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Movimiento de stock</h3>
              <div className="mt-5 space-y-4">
                <select
                  value={stockMovementForm.inventory_item_id}
                  onChange={(event) => {
                    const item = inventoryItems.find((entry) => entry.id === Number(event.target.value));
                    setStockMovementForm((previous) => ({
                      ...previous,
                      inventory_item_id: event.target.value,
                      unit_cost: item ? (item.unit_cost_cents / 100).toFixed(2) : previous.unit_cost,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Selecciona item</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select value={stockMovementForm.type} onChange={(event) => setStockMovementForm((previous) => ({ ...previous, type: event.target.value as StockMovement['type'] }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="purchase">Compra</option>
                  <option value="consume">Consumo</option>
                  <option value="adjustment">Ajuste</option>
                  <option value="return">Devolucion</option>
                </select>
                <input type="number" min="0.1" step="0.1" value={stockMovementForm.quantity} onChange={(event) => setStockMovementForm((previous) => ({ ...previous, quantity: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Cantidad" />
                <input type="number" min="0" step="0.01" value={stockMovementForm.unit_cost} onChange={(event) => setStockMovementForm((previous) => ({ ...previous, unit_cost: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Coste unitario" />
                <textarea value={stockMovementForm.notes} onChange={(event) => setStockMovementForm((previous) => ({ ...previous, notes: event.target.value }))} className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Motivo o referencia" />
              </div>
              <button type="submit" disabled={createStockMovementMutation.isPending || !stockMovementForm.inventory_item_id} className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300">
                {createStockMovementMutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
              </button>
            </form>

            <form onSubmit={handlePurchaseOrderSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Orden de compra</h3>
                  <p className="mt-1 text-sm text-slate-500">Genera pedidos y deja trazado el material que llega.</p>
                </div>
                <button type="button" onClick={() => setPurchaseOrderForm((previous) => ({ ...previous, items: [...previous.items, emptyPurchaseOrderLine()] }))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Anadir articulo
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <select value={purchaseOrderForm.supplier_id} onChange={(event) => setPurchaseOrderForm((previous) => ({ ...previous, supplier_id: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <select value={purchaseOrderForm.status} onChange={(event) => setPurchaseOrderForm((previous) => ({ ...previous, status: event.target.value as PurchaseOrder['status'] }))} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <option value="draft">Borrador</option>
                  <option value="ordered">Pedido</option>
                  <option value="received">Recibido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="mt-5 space-y-3">
                {purchaseOrderForm.items.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <select
                      value={item.inventory_item_id}
                      onChange={(event) => {
                        const inventoryItem = inventoryItems.find((entry) => entry.id === Number(event.target.value));
                        updatePurchaseOrderLine(index, {
                          inventory_item_id: event.target.value,
                          description: inventoryItem?.name ?? item.description,
                          unit_cost: inventoryItem ? (inventoryItem.unit_cost_cents / 100).toFixed(2) : item.unit_cost,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      <option value="">Articulo relacionado opcional</option>
                      {inventoryItems.map((inventoryItem) => (
                        <option key={inventoryItem.id} value={inventoryItem.id}>
                          {inventoryItem.name}
                        </option>
                      ))}
                    </select>
                    <input value={item.description} onChange={(event) => updatePurchaseOrderLine(index, { description: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Descripcion" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input type="number" min="0.1" step="0.1" value={item.quantity} onChange={(event) => updatePurchaseOrderLine(index, { quantity: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Cantidad" />
                      <input type="number" min="0" step="0.01" value={item.unit_cost} onChange={(event) => updatePurchaseOrderLine(index, { unit_cost: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Coste" />
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseOrderForm((previous) => ({
                            ...previous,
                            items: previous.items.length === 1 ? previous.items : previous.items.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <textarea value={purchaseOrderForm.notes} onChange={(event) => setPurchaseOrderForm((previous) => ({ ...previous, notes: event.target.value }))} className="mt-4 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" placeholder="Notas de compra" />
              <button type="submit" disabled={createPurchaseOrderMutation.isPending || purchaseOrderForm.items.some((item) => !item.description.trim())} className="mt-5 rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:bg-slate-300">
                {createPurchaseOrderMutation.isPending ? 'Creando...' : 'Crear orden'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Inventario y sedes</h3>
          </div>

          <div className="space-y-6 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-700">Articulos</p>
              <div className="mt-3 space-y-3">
                {inventoryItems.length === 0 && <p className="text-sm text-slate-500">No hay items cargados.</p>}
                {inventoryItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.category} - {item.location?.name || 'Sin centro'} - {valuationMethodLabel(item.valuation_method)}
                        </p>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {item.stock_quantity} {item.unit}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${isLowStock(item) ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {isLowStock(item) ? 'Reponer' : 'Stock correcto'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700">Centros</p>
                <div className="mt-3 space-y-2">
                  {locations.map((location) => (
                    <div key={location.id} className="text-sm text-slate-600">
                      {location.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700">Proveedores</p>
                <div className="mt-3 space-y-2">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="text-sm text-slate-600">
                      {supplier.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Movimientos recientes</h3>
            <div className="mt-4 space-y-3">
              {stockMovements.length === 0 && <p className="text-sm text-slate-500">Todavia no hay movimientos.</p>}
              {stockMovements.slice(0, 8).map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{movement.item?.name || `Item #${movement.inventory_item_id}`}</p>
                      <p className="mt-1 text-sm text-slate-500">{movementTypeLabel(movement.type)}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{movement.quantity}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(movement.moved_at)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Pedidos</h3>
            <div className="mt-4 space-y-3">
              {purchaseOrders.length === 0 && <p className="text-sm text-slate-500">No hay ordenes generadas.</p>}
              {purchaseOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{order.number}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.supplier?.name || 'Sin proveedor'}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{formatCurrency(order.total_cents)}</p>
                  <p className="mt-1 text-xs text-slate-500">Pedido: {formatDate(order.ordered_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

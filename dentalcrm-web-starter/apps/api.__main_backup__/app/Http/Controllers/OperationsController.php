<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\Location;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OperationsController extends Controller
{
    public function locations()
    {
        return response()->json(
            Location::query()->orderByDesc('is_active')->orderBy('name')->get()
        );
    }

    public function storeLocation(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:180'],
            'is_active' => ['boolean'],
        ]);

        $location = Location::query()->create($data);

        return response()->json($location, 201);
    }

    public function updateLocation(Request $request, Location $location)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:180'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $location->update($data);

        return response()->json($location);
    }

    public function suppliers()
    {
        return response()->json(
            Supplier::query()->orderBy('name')->get()
        );
    }

    public function storeSupplier(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'contact_name' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ]);

        $supplier = Supplier::query()->create($data);

        return response()->json($supplier, 201);
    }

    public function inventorySummary()
    {
        $items = InventoryItem::query()->get();

        return response()->json([
            'items_count' => $items->count(),
            'low_stock_count' => $items->filter(fn (InventoryItem $item) => (float) $item->stock_quantity <= (float) $item->reorder_level)->count(),
            'inventory_value_cents' => (int) $items->reduce(
                fn (int $carry, InventoryItem $item) => $carry + (int) round(((float) $item->stock_quantity) * $item->unit_cost_cents),
                0
            ),
        ]);
    }

    public function inventoryItems(Request $request)
    {
        $items = InventoryItem::query()
            ->with(['supplier:id,name', 'location:id,name'])
            ->when($request->filled('low_stock'), fn ($query) => $query->whereColumn('stock_quantity', '<=', 'reorder_level'))
            ->orderBy('name')
            ->get();

        return response()->json($items);
    }

    public function storeInventoryItem(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('clinic_id', $clinicId)],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'sku' => ['nullable', 'string', 'max:60'],
            'name' => ['required', 'string', 'max:140'],
            'category' => ['required', 'string', 'max:80'],
            'unit' => ['required', 'string', 'max:20'],
            'stock_quantity' => ['numeric', 'min:0'],
            'reorder_level' => ['numeric', 'min:0'],
            'unit_cost_cents' => ['required', 'integer', 'min:0'],
            'valuation_method' => ['required', 'string', Rule::in(['average', 'fifo', 'lifo'])],
            'is_active' => ['boolean'],
        ]);

        $item = InventoryItem::query()->create($data);

        return response()->json($item->load(['supplier:id,name', 'location:id,name']), 201);
    }

    public function updateInventoryItem(Request $request, InventoryItem $inventoryItem)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('clinic_id', $clinicId)],
            'location_id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where('clinic_id', $clinicId)],
            'sku' => ['nullable', 'string', 'max:60'],
            'name' => ['sometimes', 'required', 'string', 'max:140'],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'unit' => ['sometimes', 'required', 'string', 'max:20'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost_cents' => ['sometimes', 'integer', 'min:0'],
            'valuation_method' => ['sometimes', 'required', 'string', Rule::in(['average', 'fifo', 'lifo'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $inventoryItem->update($data);

        return response()->json($inventoryItem->load(['supplier:id,name', 'location:id,name']));
    }

    public function stockMovements()
    {
        return response()->json(
            StockMovement::query()->with('item:id,name,unit')->latest('moved_at')->get()
        );
    }

    public function storeStockMovement(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'inventory_item_id' => ['required', 'integer', Rule::exists('inventory_items', 'id')->where('clinic_id', $clinicId)],
            'type' => ['required', 'string', Rule::in(['purchase', 'consume', 'adjustment', 'return'])],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit_cost_cents' => ['nullable', 'integer', 'min:0'],
            'reference_type' => ['nullable', 'string', 'max:80'],
            'reference_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string'],
            'moved_at' => ['nullable', 'date'],
        ]);

        $movement = DB::transaction(function () use ($data) {
            $item = InventoryItem::query()->lockForUpdate()->findOrFail($data['inventory_item_id']);
            $quantity = (float) $data['quantity'];
            $signedQuantity = in_array($data['type'], ['consume'], true) ? -$quantity : $quantity;

            $item->update([
                'stock_quantity' => max(0, round(((float) $item->stock_quantity) + $signedQuantity, 2)),
                'unit_cost_cents' => $data['unit_cost_cents'] ?? $item->unit_cost_cents,
            ]);

            return StockMovement::query()->create([
                ...$data,
                'unit_cost_cents' => $data['unit_cost_cents'] ?? $item->unit_cost_cents,
                'moved_at' => $data['moved_at'] ?? now(),
            ]);
        });

        return response()->json($movement->load('item:id,name,unit'), 201);
    }

    public function purchaseOrders()
    {
        return response()->json(
            PurchaseOrder::query()->with(['supplier:id,name', 'items.inventoryItem:id,name'])->latest('id')->get()
        );
    }

    public function storePurchaseOrder(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('clinic_id', $clinicId)],
            'ordered_at' => ['nullable', 'date'],
            'expected_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'ordered', 'received', 'cancelled'])],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_item_id' => ['nullable', 'integer', Rule::exists('inventory_items', 'id')->where('clinic_id', $clinicId)],
            'items.*.description' => ['required', 'string', 'max:180'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_cost_cents' => ['required', 'integer', 'min:0'],
        ]);

        $order = DB::transaction(function () use ($data) {
            $order = PurchaseOrder::query()->create([
                'supplier_id' => $data['supplier_id'] ?? null,
                'number' => sprintf('PO-%s-%05d', now()->format('Y'), PurchaseOrder::query()->withoutGlobalScopes()->count() + 1),
                'status' => $data['status'] ?? 'ordered',
                'ordered_at' => $data['ordered_at'] ?? now()->toDateString(),
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $total = 0;

            foreach ($data['items'] as $itemData) {
                $lineTotal = (int) round(((float) $itemData['quantity']) * $itemData['unit_cost_cents']);
                $total += $lineTotal;

                $order->items()->create([
                    'inventory_item_id' => $itemData['inventory_item_id'] ?? null,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost_cents' => $itemData['unit_cost_cents'],
                    'total_cents' => $lineTotal,
                ]);

                if (($data['status'] ?? 'ordered') === 'received' && !empty($itemData['inventory_item_id'])) {
                    $inventoryItem = InventoryItem::query()->lockForUpdate()->find($itemData['inventory_item_id']);
                    if ($inventoryItem) {
                        $inventoryItem->update([
                            'stock_quantity' => round(((float) $inventoryItem->stock_quantity) + ((float) $itemData['quantity']), 2),
                            'unit_cost_cents' => $itemData['unit_cost_cents'],
                        ]);

                        StockMovement::query()->create([
                            'inventory_item_id' => $inventoryItem->id,
                            'type' => 'purchase',
                            'quantity' => $itemData['quantity'],
                            'unit_cost_cents' => $itemData['unit_cost_cents'],
                            'reference_type' => 'purchase_order',
                            'reference_id' => $order->id,
                            'notes' => $order->number,
                            'moved_at' => now(),
                        ]);
                    }
                }
            }

            $order->update(['total_cents' => $total]);

            return $order;
        });

        return response()->json($order->load(['supplier:id,name', 'items.inventoryItem:id,name']), 201);
    }
}

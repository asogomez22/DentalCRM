<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'supplier_id',
        'location_id',
        'sku',
        'name',
        'category',
        'unit',
        'stock_quantity',
        'reorder_level',
        'unit_cost_cents',
        'valuation_method',
        'is_active',
    ];

    protected $casts = [
        'stock_quantity' => 'decimal:2',
        'reorder_level' => 'decimal:2',
        'unit_cost_cents' => 'integer',
        'is_active' => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}

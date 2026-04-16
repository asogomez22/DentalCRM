<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'supplier_id',
        'number',
        'status',
        'ordered_at',
        'expected_at',
        'total_cents',
        'notes',
    ];

    protected $casts = [
        'ordered_at' => 'date:Y-m-d',
        'expected_at' => 'date:Y-m-d',
        'total_cents' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }
}

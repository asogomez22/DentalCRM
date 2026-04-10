<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItem extends Model
{
    protected $fillable = [
        'quote_id',
        'treatment_id',
        'description',
        'quantity',
        'unit_price_cents',
        'total_cents',
        'accepted',
    ];

    protected $casts = [
        'quantity'          => 'integer',
        'unit_price_cents'  => 'integer',
        'total_cents'       => 'integer',
        'accepted'          => 'boolean',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function treatment(): BelongsTo
    {
        return $this->belongsTo(Treatment::class);
    }
}

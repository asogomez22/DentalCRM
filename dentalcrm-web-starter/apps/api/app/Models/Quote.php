<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'user_id',
        'appointment_id',
        'number',
        'title',
        'status',
        'notes',
        'valid_until',
        'subtotal_cents',
        'total_cents',
        'currency',
        'sent_at',
        'responded_at',
    ];

    protected $casts = [
        'valid_until'   => 'date',
        'sent_at'       => 'datetime',
        'responded_at'  => 'datetime',
        'subtotal_cents'=> 'integer',
        'total_cents'   => 'integer',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }
}

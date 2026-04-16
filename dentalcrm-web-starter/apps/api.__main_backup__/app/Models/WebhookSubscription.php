<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;

class WebhookSubscription extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'name',
        'url',
        'secret',
        'events_json',
        'last_triggered_at',
        'is_active',
    ];

    protected $casts = [
        'events_json' => 'array',
        'last_triggered_at' => 'datetime',
        'is_active' => 'boolean',
    ];
}

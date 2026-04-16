<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;

class ClinicIntegration extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'provider',
        'status',
        'settings_json',
        'last_sync_at',
    ];

    protected $casts = [
        'settings_json' => 'array',
        'last_sync_at' => 'datetime',
    ];
}

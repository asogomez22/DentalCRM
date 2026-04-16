<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'name',
        'key_hash',
        'scopes_json',
        'last_used_at',
        'is_active',
    ];

    protected $casts = [
        'scopes_json' => 'array',
        'last_used_at' => 'datetime',
        'is_active' => 'boolean',
    ];
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'actor_type',
        'actor_id',
        'action',
        'target_type',
        'target_id',
        'description',
        'metadata_json',
        'ip_address',
    ];

    protected $casts = [
        'metadata_json' => 'array',
    ];
}

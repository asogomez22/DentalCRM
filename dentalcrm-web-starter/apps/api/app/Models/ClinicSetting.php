<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicSetting extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'brand_name',
        'primary_color',
        'secondary_color',
        'logo_url',
        'public_phone',
        'public_email',
        'booking_enabled',
        'settings_json',
    ];

    protected $casts = [
        'booking_enabled' => 'boolean',
        'settings_json' => 'array',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}

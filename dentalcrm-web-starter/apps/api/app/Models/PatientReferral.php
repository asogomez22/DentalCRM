<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientReferral extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'referrer_patient_id',
        'referral_code',
        'referred_name',
        'referred_email',
        'referred_phone',
        'status',
        'reward_points',
    ];

    protected $casts = [
        'reward_points' => 'integer',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'referrer_patient_id');
    }
}

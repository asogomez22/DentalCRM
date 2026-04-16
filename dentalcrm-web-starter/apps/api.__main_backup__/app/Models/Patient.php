<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Patient extends Authenticatable
{
    use HasApiTokens, Notifiable, BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'first_name',
        'last_name',
        'dni',
        'email',
        'phone',
        'source',
        'birth_date',
        'notes',
        'marketing_opt_in',
        'last_seen_at',
        'portal_points',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
        'birth_date' => 'date:Y-m-d',
        'marketing_opt_in' => 'boolean',
        'last_seen_at' => 'datetime',
        'portal_points' => 'integer',
    ];

    protected $hidden = [
        'remember_token',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function communicationLogs(): HasMany
    {
        return $this->hasMany(CommunicationLog::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(PatientReview::class);
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(PatientReferral::class, 'referrer_patient_id');
    }

    public function privacyRequests(): HasMany
    {
        return $this->hasMany(PrivacyRequest::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(ConsentRecord::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim(sprintf('%s %s', $this->first_name, $this->last_name));
    }
}

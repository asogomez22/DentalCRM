<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class TelemedicineSession extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'dentist_id',
        'appointment_id',
        'status',
        'room_code',
        'provider',
        'scheduled_at',
        'started_at',
        'ended_at',
        'duration_minutes',
        'notes',
        'recording_url',
    ];

    protected $casts = [
        'scheduled_at'     => 'datetime',
        'started_at'       => 'datetime',
        'ended_at'         => 'datetime',
        'duration_minutes' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (TelemedicineSession $session) {
            if (empty($session->room_code)) {
                $session->room_code = Str::random(12);
            }
        });
    }

    public function getRoomUrlAttribute(): string
    {
        return match ($this->provider) {
            'whereby'  => "https://whereby.com/{$this->room_code}",
            default    => "https://meet.jit.si/dentalcrm-{$this->room_code}",
        };
    }

    protected $appends = ['room_url'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function dentist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'first_name',
        'last_name',
        'dni',
        'email',
        'phone',
        'birth_date',
        'notes',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
        'birth_date' => 'date:Y-m-d',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}

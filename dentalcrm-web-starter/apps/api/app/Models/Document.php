<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'uploaded_by',
        'category',
        'filename',
        'original_name',
        'mime_type',
        'size_bytes',
        'disk',
        'path',
        'extracted_text',
        'metadata_json',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'metadata_json' => 'array',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function consents()
    {
        return $this->hasMany(ConsentRecord::class);
    }
}

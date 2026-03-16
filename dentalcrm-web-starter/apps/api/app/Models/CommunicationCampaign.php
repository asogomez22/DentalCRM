<?php

namespace App\Models;

use App\Models\Concerns\BelongsToClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunicationCampaign extends Model
{
    use BelongsToClinic;

    protected $fillable = [
        'clinic_id',
        'name',
        'channel',
        'segment',
        'status',
        'subject',
        'body',
        'scheduled_at',
        'sent_at',
        'metrics_json',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'metrics_json' => 'array',
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(CommunicationLog::class, 'campaign_id');
    }
}

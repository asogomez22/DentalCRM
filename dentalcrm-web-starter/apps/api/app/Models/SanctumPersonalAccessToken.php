<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken;

class SanctumPersonalAccessToken extends PersonalAccessToken
{
    protected $table = 'personal_access_tokens';

    public function getConnectionName(): ?string
    {
        if (is_file('/.dockerenv')) {
            return getenv('DB_CONNECTION') ?: 'pgsql';
        }

        return parent::getConnectionName();
    }
}

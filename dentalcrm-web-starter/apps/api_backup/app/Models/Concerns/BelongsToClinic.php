<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToClinic
{
    protected static function bootBelongsToClinic(): void
    {
        static::creating(function ($model) {
            if (!$model->clinic_id && app()->bound('currentClinic')) {
                $model->clinic_id = app('currentClinic')->id;
            }
        });

        static::addGlobalScope('clinic', function (Builder $builder) {
            if (app()->bound('currentClinic')) {
                $builder->where($builder->getModel()->getTable() . '.clinic_id', app('currentClinic')->id);
            }
        });
    }
}

<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditApiActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!app()->bound('currentClinic')) {
            return $response;
        }

        $actor = $request->user();

        $actorType = match (true) {
            $actor instanceof Patient => 'patient',
            $actor instanceof User => 'user',
            default => 'system',
        };

        $targetType = null;
        $targetId = null;

        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if (is_object($parameter) && method_exists($parameter, 'getKey')) {
                $targetType = class_basename($parameter);
                $targetId = (string) $parameter->getKey();
                break;
            }

            if (is_scalar($parameter)) {
                $targetId = (string) $parameter;
            }
        }

        AuditLog::query()->create([
            'clinic_id' => app('currentClinic')->id,
            'actor_type' => $actorType,
            'actor_id' => method_exists($actor, 'getKey') ? $actor->getKey() : null,
            'action' => sprintf('%s %s', $request->method(), $request->path()),
            'target_type' => $targetType,
            'target_id' => $targetId,
            'description' => $request->route()?->uri() ?? $request->path(),
            'ip_address' => $request->ip(),
            'metadata_json' => [
                'status' => $response->getStatusCode(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return $response;
    }
}

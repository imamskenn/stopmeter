<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(
        string $action,
        string $targetType,
        mixed $targetId = null,
        string $description = '',
        array $metadata = []
    ): void {
        $user = Auth::user();

        ActivityLog::create([
            'actor_id' => $user?->id,
            'actor_name' => $user?->name ?? 'System',
            'actor_role' => $user?->role ?? 'system',
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId ? (string) $targetId : null,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
        ]);
    }
}

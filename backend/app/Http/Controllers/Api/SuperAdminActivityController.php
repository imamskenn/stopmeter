<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class SuperAdminActivityController extends Controller
{
    public function index()
    {
        $activities = ActivityLog::orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'message' => 'Activity summary loaded.',
            'data' => [
                'total' => ActivityLog::count(),
                'today' => ActivityLog::whereDate(
                    'created_at',
                    now()->toDateString()
                )->count(),
                'recent' => $activities,
            ],
        ]);
    }
}

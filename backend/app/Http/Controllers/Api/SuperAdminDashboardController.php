<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Outlet;

class SuperAdminDashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'message' => 'Dashboard data loaded.',
            'data' => [
                'admins' => [
                    'total' => User::where('role', 'admin')->count(),
                    'active' => User::where('role', 'admin')
                        ->where('is_active', true)->count(),
                    'inactive' => User::where('role', 'admin')
                        ->where('is_active', false)->count(),
                ],

                'employees' => [
                    'total' => User::where('role', 'employee')->count(),
                    'active' => User::where('role', 'employee')
                        ->where('is_active', true)->count(),
                    'inactive' => User::where('role', 'employee')
                        ->where('is_active', false)->count(),
                ],

                'outlets' => [
                    'total' => Outlet::count(),
                    'active' => Outlet::where('is_active', true)->count(),
                    'inactive' => Outlet::where('is_active', false)->count(),
                ],
            ],
        ]);
    }
}

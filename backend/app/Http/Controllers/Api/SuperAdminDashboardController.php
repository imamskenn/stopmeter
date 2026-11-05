<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Outlet;
use App\Services\InchasReport;
use Carbon\Carbon;

class SuperAdminDashboardController extends Controller
{
    public function __construct(private readonly InchasReport $inchas)
    {
    }

    public function index()
    {
        $admins = User::where('role', 'admin');
        $employees = User::where('role', 'employee');

        $months = collect(range(5, 0))->map(function ($i) {
            $date = now()->subMonths($i);

            return [
                'key' => $date->format('Y-m'),
                'month' => $date->format('M Y'),
            ];
        });

        $growth = $months->map(function ($month) {
            $start = Carbon::createFromFormat(
                'Y-m',
                $month['key']
            )->startOfMonth();

            $end = $start->copy()->endOfMonth();

            return [
                'month' => $month['month'],
                'admins' => User::where('role', 'admin')
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),

                'employees' => User::where('role', 'employee')
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),

                'outlets' => Outlet::whereBetween(
                    'created_at',
                    [$start, $end]
                )->count(),
            ];
        });

        return response()->json([
            'message' => 'Dashboard data loaded.',
            'data' => [
                'admins' => [
                    'total' => $admins->count(),
                    'active' => User::where('role', 'admin')
                        ->where('is_active', true)->count(),
                    'inactive' => User::where('role', 'admin')
                        ->where('is_active', false)->count(),
                ],

                'employees' => [
                    'total' => $employees->count(),
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

                'growth' => [
                    'period' => '6_months',
                    'monthly' => $growth,
                ],

                // Rekap Inchas in/out per admin untuk seluruh outlet.
                'inchas' => $this->inchas->build(null),
            ],
        ]);
    }
}

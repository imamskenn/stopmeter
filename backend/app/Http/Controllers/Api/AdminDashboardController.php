<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Outlet;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        $admin = $request->user();

        $allowedIds = array_values(array_unique(array_map(
            'strval',
            $admin->outlet_ids ?? []
        )));

        $outlets = empty($allowedIds)
            ? collect()
            : Outlet::whereIn('_id', $allowedIds)->get();

        $employees = User::where('role', 'employee')->get()
            ->filter(function ($employee) use ($allowedIds) {
                $assigned = array_map(
                    'strval',
                    $employee->outlet_ids ?? []
                );

                return !empty($assigned)
                    && empty(array_diff($assigned, $allowedIds));
            })
            ->values();

        return response()->json([
            'message' => 'Admin dashboard loaded.',
            'data' => [
                'outlets' => [
                    'total' => $outlets->count(),
                    'active' => $outlets->where('is_active', true)->count(),
                    'inactive' => $outlets->where('is_active', false)->count(),
                ],
                'employees' => [
                    'total' => $employees->count(),
                    'active' => $employees->where('is_active', true)->count(),
                    'inactive' => $employees->where('is_active', false)->count(),
                ],
                'outlet_list' => $outlets->values(),
            ],
        ]);
    }
}

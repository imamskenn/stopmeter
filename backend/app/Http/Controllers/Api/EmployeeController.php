<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'employee');

        if ($request->user()->role === 'admin') {
            $query->whereIn('outlet_ids', $request->user()->outlet_ids ?? []);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:10'],
            'outlet_ids' => ['required', 'array', 'min:1'],
            'outlet_ids.*' => ['required', 'string'],
        ]);

        if (User::where('email', $data['email'])->exists()) {
            return response()->json(['message' => 'Email sudah digunakan.'], 422);
        }

        $outletIds = array_values(array_unique($data['outlet_ids']));
        $actor = $request->user();

        $outlets = Outlet::whereIn('_id', $outletIds)
            ->where('is_active', true)
            ->get();

        if ($outlets->count() !== count($outletIds)) {
            return response()->json(['message' => 'Outlet tidak valid atau nonaktif.'], 422);
        }

        if ($actor->role === 'admin') {
            $allowed = $actor->outlet_ids ?? [];

            foreach ($outletIds as $outletId) {
                if (!in_array($outletId, $allowed, true)) {
                    return response()->json(['message' => 'Akses outlet ditolak.'], 403);
                }
            }
        }

        $employee = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'employee',
            'outlet_ids' => $outletIds,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Employee berhasil dibuat.',
            'data' => $employee,
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $employee = User::where('_id', $id)
            ->where('role', 'employee')
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee tidak ditemukan.'], 404);
        }

        $actor = $request->user();

        if ($actor->role === 'admin') {
            $allowed = $actor->outlet_ids ?? [];
            if (!array_intersect($employee->outlet_ids ?? [], $allowed)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'password' => ['sometimes', 'nullable', 'string', 'min:10'],
            'outlet_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'outlet_ids.*' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['outlet_ids'])) {
            $ids = array_values(array_unique($data['outlet_ids']));

            if ($actor->role === 'admin' &&
                array_diff($ids, $actor->outlet_ids ?? [])) {
                return response()->json(['message' => 'Akses outlet ditolak.'], 403);
            }

            $count = Outlet::whereIn('_id', $ids)->where('is_active', true)->count();

            if ($count !== count($ids)) {
                return response()->json(['message' => 'Outlet tidak valid.'], 422);
            }

            $data['outlet_ids'] = $ids;
        }

        if (empty($data['password'] ?? null)) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $employee->update($data);

        return response()->json([
            'message' => 'Employee berhasil diperbarui.',
            'data' => $employee->fresh(),
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $employee = User::where('_id', $id)
            ->where('role', 'employee')
            ->first();

        if (!$employee) {
            return response()->json(['message' => 'Employee tidak ditemukan.'], 404);
        }

        if ($request->user()->role === 'admin' &&
            !array_intersect(
                $employee->outlet_ids ?? [],
                $request->user()->outlet_ids ?? []
            )) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $employee->update(['is_active' => false]);

        return response()->json(['message' => 'Employee dinonaktifkan.']);
    }
}

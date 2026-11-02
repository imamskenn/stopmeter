<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Support\ActivityLogger;

class AdminController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::where('role', 'admin')->get(),
        ]);
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

        $validCount = Outlet::whereIn('_id', $outletIds)
            ->where('is_active', true)
            ->count();

        if ($validCount !== count($outletIds)) {
            return response()->json([
                'message' => 'Ada outlet tidak valid atau nonaktif.',
            ], 422);
        }

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'admin',
            'outlet_ids' => $outletIds,
            'is_active' => true,
        ]);
ActivityLogger::log(
    'admin.created',
    'admin',
    $admin->id,
    "Admin {$admin->name} berhasil dibuat."
);

        return response()->json([
            'message' => 'Admin berhasil dibuat.',
            'data' => $admin,
        ], 201);
    }

    public function show(string $id)
    {
        $admin = User::where('_id', $id)
            ->where('role', 'admin')
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Admin tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $admin]);
    }

    public function update(Request $request, string $id)
    {
        $admin = User::where('_id', $id)
            ->where('role', 'admin')
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Admin tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'password' => ['sometimes', 'nullable', 'string', 'min:10'],
            'outlet_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'outlet_ids.*' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['email']) &&
            User::where('email', $data['email'])
                ->where('_id', '!=', $admin->_id)
                ->exists()) {
            return response()->json(['message' => 'Email sudah digunakan.'], 422);
        }

        if (isset($data['outlet_ids'])) {
            $outletIds = array_values(array_unique($data['outlet_ids']));

            $validCount = Outlet::whereIn('_id', $outletIds)
                ->where('is_active', true)
                ->count();

            if ($validCount !== count($outletIds)) {
                return response()->json([
                    'message' => 'Ada outlet tidak valid atau nonaktif.',
                ], 422);
            }

            $data['outlet_ids'] = $outletIds;
        }

        if (empty($data['password'] ?? null)) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $admin->update($data);
ActivityLogger::log(
    'admin.updated',
    'admin',
    $admin->id,
    "Admin {$admin->name} diperbarui.",
    ['changes' => array_diff_key($data, ['password' => true])]
);
        return response()->json([
            'message' => 'Admin berhasil diperbarui.',
            'data' => $admin->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $admin = User::where('_id', $id)
            ->where('role', 'admin')
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Admin tidak ditemukan.'], 404);
        }

        $admin->update(['is_active' => false]);
ActivityLogger::log(
    'admin.deactivated',
    'admin',
    $admin->id,
    "Admin {$admin->name} dinonaktifkan."
);

        return response()->json([
            'message' => 'Admin berhasil dinonaktifkan.',
        ]);
    }
}

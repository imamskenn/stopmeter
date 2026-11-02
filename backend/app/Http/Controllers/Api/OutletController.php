<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OutletController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Outlet::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:30', 'alpha_dash'],
            'address' => ['nullable', 'string', 'max:500'],
            'settings' => ['nullable', 'array'],
        ]);

        if (Outlet::where('code', $data['code'])->exists()) {
            return response()->json([
                'message' => 'Kode outlet sudah digunakan.',
            ], 422);
        }

        $data['is_active'] = true;

        $outlet = Outlet::create($data);

        return response()->json([
            'message' => 'Outlet berhasil dibuat.',
            'data' => $outlet,
        ], 201);
    }

    public function show(string $id)
    {
        $outlet = Outlet::find($id);

        if (!$outlet) {
            return response()->json(['message' => 'Outlet tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $outlet]);
    }

    public function update(Request $request, string $id)
    {
        $outlet = Outlet::find($id);

        if (!$outlet) {
            return response()->json(['message' => 'Outlet tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                'alpha_dash',
            ],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        if (isset($data['code']) &&
            Outlet::where('code', $data['code'])
                ->where('_id', '!=', $outlet->_id)
                ->exists()) {
            return response()->json([
                'message' => 'Kode outlet sudah digunakan.',
            ], 422);
        }

        $outlet->update($data);

        return response()->json([
            'message' => 'Outlet berhasil diperbarui.',
            'data' => $outlet->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $outlet = Outlet::find($id);

        if (!$outlet) {
            return response()->json(['message' => 'Outlet tidak ditemukan.'], 404);
        }

        // Nonaktifkan outlet, jangan hapus data historis.
        $outlet->update(['is_active' => false]);

        return response()->json([
            'message' => 'Outlet berhasil dinonaktifkan.',
        ]);
    }
}

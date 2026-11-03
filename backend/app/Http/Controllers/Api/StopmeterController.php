<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stopmeter;
use Illuminate\Http\Request;

class StopmeterController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Stopmeter::query();

        if ($user->role === 'admin') {
            $allowed = array_map('strval', $user->outlet_ids ?? []);

            if (empty($allowed)) {
                return response()->json(['data' => []]);
            }

            $query->whereIn('outlet_id', $allowed);
        } elseif ($user->role === 'employee') {
            $query->where('employee_id', (string) $user->id);
        } elseif ($user->role !== 'super_admin') {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('outlet_id') && $user->role !== 'employee') {
            $query->where('outlet_id', $request->input('outlet_id'));
        }

        return response()->json([
            'data' => $query->orderBy('created_at', 'desc')
                ->limit(100)
                ->get(),
        ]);
    }

    public function show(Request $request, string $id)
    {
        $record = Stopmeter::where('_id', $id)->first();

        if (!$record) {
            return response()->json(['message' => 'Stopmeter tidak ditemukan.'], 404);
        }

        $user = $request->user();

        if ($user->role === 'admin') {
            $allowed = array_map('strval', $user->outlet_ids ?? []);

            if (!in_array((string) $record->outlet_id, $allowed, true)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        } elseif (
            $user->role === 'employee' &&
            (string) $record->employee_id !== (string) $user->id
        ) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        } elseif (!in_array($user->role, ['super_admin', 'admin', 'employee'], true)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        return response()->json(['data' => $record]);
    }
}

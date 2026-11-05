<?php

namespace App\Http\Controllers\Api;

use App\Enums\StopmeterSession;
use App\Exceptions\InvalidMeterReadingException;
use App\Exceptions\StopmeterConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStopmeterRequest;
use App\Models\Outlet;
use App\Models\OutletMeterState;
use App\Models\Stopmeter;
use App\Services\StopmeterFinalizer;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StopmeterController extends Controller
{
    public function __construct(private readonly StopmeterFinalizer $finalizer)
    {
    }

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

    /**
     * Data awal untuk form Stopmeter employee: bacaan R/M terakhir outlet
     * (carry-forward) dan status submit shift yang dipilih.
     */
    public function active(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'outlet_id' => ['required', 'string', 'max:64'],
            'session' => ['sometimes', 'string', Rule::in(StopmeterSession::values())],
            'operational_date' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        $outletId = (string) $data['outlet_id'];
        $assigned = array_map('strval', $user->outlet_ids ?? []);

        if (! in_array($outletId, $assigned, true)) {
            return response()->json([
                'message' => 'Anda tidak ditugaskan pada outlet ini.',
            ], 403);
        }

        $state = OutletMeterState::where('outlet_id', $outletId)->first();
        $operationalDate = $this->finalizer->normalizeOperationalDate(
            (string) ($data['operational_date'] ?? '')
        );

        $session = $data['session'] ?? null;

        $existing = $session === null
            ? null
            : Stopmeter::where('outlet_id', $outletId)
                ->where('employee_id', (string) $user->id)
                ->where('operational_date', $operationalDate)
                ->where('session', $session)
                ->first();

        return response()->json([
            'data' => [
                'outlet_id' => $outletId,
                'operational_date' => $operationalDate->toDateString(),
                'session' => $session,
                'requires_initial_readings' => $state === null,
                'r_initial' => $state?->r_current,
                'm_initial' => $state?->m_current,
                'meter_version' => $state?->version,
                'already_submitted' => $existing !== null,
                'existing' => $existing,
            ],
        ]);
    }

    /**
     * Konteks form employee: outlet yang ditugaskan beserta bacaan awal dari
     * state meter, tanggal operasional, dan daftar shift. Satu request supaya
     * frontend tidak perlu menebak nama outlet atau nilai awal meter.
     */
    public function context(Request $request)
    {
        $user = $request->user();
        $assigned = array_map('strval', $user->outlet_ids ?? []);

        $operationalDate = $this->finalizer
            ->normalizeOperationalDate('')
            ->toDateString();

        if ($assigned === []) {
            return response()->json([
                'data' => [
                    'outlets' => [],
                    'operational_date' => $operationalDate,
                    'sessions' => StopmeterSession::values(),
                ],
            ]);
        }

        $outlets = Outlet::whereIn('_id', $assigned)
            ->where('is_active', true)
            ->get();

        $states = OutletMeterState::whereIn('outlet_id', $assigned)
            ->get()
            ->keyBy(static fn ($state): string => (string) $state->outlet_id);

        $rows = $outlets->map(function ($outlet) use ($states): array {
            $outletId = (string) $outlet->_id;
            $state = $states->get($outletId);

            return [
                'id' => $outletId,
                'name' => $outlet->name,
                'code' => $outlet->code,
                'r_initial' => $state?->r_current,
                'm_initial' => $state?->m_current,
                'requires_initial_readings' => $state === null,
            ];
        })->values();

        return response()->json([
            'data' => [
                'outlets' => $rows,
                'operational_date' => $operationalDate,
                'sessions' => StopmeterSession::values(),
            ],
        ]);
    }

    /**
     * Submit Stopmeter employee. Record langsung final dan terkunci.
     */
    public function store(StoreStopmeterRequest $request)
    {
        try {
            $stopmeter = $this->finalizer->finalize(
                $request->user(),
                $request->validated()
            );
        } catch (AuthorizationException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 403);
        } catch (StopmeterConflictException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 409);
        } catch (InvalidMeterReadingException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Stopmeter berhasil difinalisasi.',
            'data' => $stopmeter,
        ], 201);
    }

    public function show(Request $request, string $id)
    {
        $record = Stopmeter::where('_id', $id)->first();

        if (! $record) {
            return response()->json(['message' => 'Stopmeter tidak ditemukan.'], 404);
        }

        $user = $request->user();

        if ($user->role === 'admin') {
            $allowed = array_map('strval', $user->outlet_ids ?? []);

            if (! in_array((string) $record->outlet_id, $allowed, true)) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }
        } elseif (
            $user->role === 'employee' &&
            (string) $record->employee_id !== (string) $user->id
        ) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        } elseif (! in_array($user->role, ['super_admin', 'admin', 'employee'], true)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        return response()->json(['data' => $record]);
    }
}

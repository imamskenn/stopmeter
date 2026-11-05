<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Stopmeter;

/**
 * Rekap uang Inchas in/out per admin (Inchas).
 *
 * Dipakai dashboard admin (hanya outlet yang ditugaskan) dan super admin
 * (semua outlet). Isinya dua bagian:
 *   - summary: total Inchas in/out per admin, diambil dari nama admin yang
 *     tercatat pada record Stopmeter,
 *   - recent : beberapa catatan terakhir yang punya Inchas in/out, supaya
 *     nama admin bisa dicek langsung di dashboard.
 */
class InchasReport
{
    public const RECENT_LIMIT = 20;

    private const FIELDS = [
        '_id',
        'outlet_id',
        'operational_date',
        'session',
        'employee_name',
        'inch_in',
        'inch_out',
        'inch_in_admin_id',
        'inch_in_admin_name',
        'inch_out_admin_id',
        'inch_out_admin_name',
        'created_at',
    ];

    /**
     * @param  array<int, string>|null  $outletIds  null = seluruh outlet
     * @return array{summary: array<int, array<string, mixed>>, recent: array<int, array<string, mixed>>}
     */
    public function build(?array $outletIds): array
    {
        if ($outletIds !== null && $outletIds === []) {
            return ['summary' => [], 'recent' => []];
        }

        $base = Stopmeter::query();

        if ($outletIds !== null) {
            $base->whereIn('outlet_id', array_values($outletIds));
        }

        $base->where(function ($query): void {
            $query->where('inch_in', '>', 0)
                ->orWhere('inch_out', '>', 0);
        });

        $summary = $this->buildSummary((clone $base)->get(self::FIELDS));
        $recent = $this->buildRecent((clone $base)
            ->orderBy('created_at', 'desc')
            ->limit(self::RECENT_LIMIT)
            ->get(self::FIELDS));

        return [
            'summary' => $summary,
            'recent' => $recent,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Stopmeter>  $records
     * @return array<int, array<string, mixed>>
     */
    private function buildSummary($records): array
    {
        $rows = [];

        foreach ($records as $record) {
            foreach ([
                ['amount' => 'inch_in', 'id' => 'inch_in_admin_id', 'name' => 'inch_in_admin_name'],
                ['amount' => 'inch_out', 'id' => 'inch_out_admin_id', 'name' => 'inch_out_admin_name'],
            ] as $field) {
                $amount = (int) $record->{$field['amount']};

                if ($amount === 0) {
                    continue;
                }

                $adminId = trim((string) ($record->{$field['id']} ?? ''));
                $adminName = trim((string) ($record->{$field['name']} ?? ''));
                $key = $adminId !== '' ? $adminId : 'nama:'.($adminName !== '' ? $adminName : 'tanpa-nama');

                if (! isset($rows[$key])) {
                    $rows[$key] = [
                        'admin_id' => $adminId !== '' ? $adminId : null,
                        'admin_name' => $adminName !== '' ? $adminName : null,
                        'inch_in' => 0,
                        'inch_out' => 0,
                        'records' => 0,
                    ];
                }

                $rows[$key][$field['amount']] += $amount;
                $rows[$key]['records']++;
            }
        }

        $rows = array_values($rows);

        usort($rows, static function (array $a, array $b): int {
            $totalA = $a['inch_in'] + $a['inch_out'];
            $totalB = $b['inch_in'] + $b['inch_out'];

            // Nominal terbesar dulu; kalau sama, urut nama supaya stabil.
            return ($totalB <=> $totalA) ?: strcmp((string) $a['admin_name'], (string) $b['admin_name']);
        });

        return $rows;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Stopmeter>  $records
     * @return array<int, array<string, mixed>>
     */
    private function buildRecent($records): array
    {
        $outletIds = $records
            ->map(static fn (Stopmeter $record): string => (string) $record->outlet_id)
            ->unique()
            ->values()
            ->all();

        $outletNames = $outletIds === []
            ? collect()
            : Outlet::whereIn('_id', $outletIds)
                ->get()
                ->keyBy(static fn (Outlet $outlet): string => (string) $outlet->_id);

        return $records->map(function (Stopmeter $record) use ($outletNames): array {
            $outletId = (string) $record->outlet_id;
            $outlet = $outletNames->get($outletId);

            return [
                'id' => (string) $record->_id,
                'outlet_id' => $outletId,
                'outlet_name' => $outlet?->name ?? $outletId,
                'operational_date' => $record->operational_date?->toDateString(),
                'session' => $record->session,
                'employee_name' => $record->employee_name,
                'inch_in' => (int) $record->inch_in,
                'inch_in_admin_name' => $record->inch_in_admin_name,
                'inch_out' => (int) $record->inch_out,
                'inch_out_admin_name' => $record->inch_out_admin_name,
            ];
        })->values()->all();
    }
}

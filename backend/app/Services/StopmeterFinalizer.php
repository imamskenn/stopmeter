<?php

namespace App\Services;

use App\Exceptions\InvalidMeterReadingException;
use App\Exceptions\StopmeterConflictException;
use App\Models\OutletMeterState;
use App\Models\Stopmeter;
use App\Models\User;
use App\Support\ActivityLogger;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Finalisasi Stopmeter.
 *
 * Satu submit employee = satu record FINAL dan langsung terkunci. Di dalam satu
 * transaksi MongoDB:
 *   1. ambil bacaan awal dari state meter outlet (bukan dari input employee),
 *   2. hitung total_limit & sales_net di server,
 *   3. simpan record final,
 *   4. carry-forward bacaan akhir ke state outlet dengan cek versi.
 *
 * Idempotensi dijaga dua lapis:
 *   - `idempotency_key` (header Idempotency-Key / field body) mengembalikan
 *     record yang sudah ada, bukan membuat record baru,
 *   - unique index (outlet_id, employee_id, operational_date, session) sebagai
 *     pengaman terakhir di database (lihat perintah stopmeter:ensure-indexes).
 *
 * Butuh MongoDB replica set (Atlas memenuhi) karena memakai transaksi.
 */
class StopmeterFinalizer
{
    /**
     * Zona waktu operasional untuk menentukan "hari ini" bila tanggal tidak dikirim.
     * Penyimpanan tetap memakai tengah malam UTC agar tanggal kalender tidak bergeser.
     */
    public const OPERATIONAL_TIMEZONE = 'Asia/Kuala_Lumpur';

    public function __construct(private readonly StopmeterCalculator $calculator)
    {
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function finalize(User $employee, array $data): Stopmeter
    {
        $employeeId = (string) $employee->id;
        $outletId = (string) $data['outlet_id'];
        $session = (string) $data['session'];
        $operationalDate = $this->normalizeOperationalDate(
            (string) ($data['operational_date'] ?? '')
        );

        $this->ensureEmployeeAssignedToOutlet($employee, $outletId);

        $idempotencyKey = $this->normalizeIdempotencyKey($data['idempotency_key'] ?? null);

        if ($idempotencyKey !== null) {
            $existing = Stopmeter::where('employee_id', $employeeId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        $alreadySubmitted = Stopmeter::where('outlet_id', $outletId)
            ->where('employee_id', $employeeId)
            ->where('operational_date', $operationalDate)
            ->where('session', $session)
            ->first();

        if ($alreadySubmitted) {
            throw new StopmeterConflictException(
                'Stopmeter untuk shift ini sudah pernah disubmit dan sudah final.'
            );
        }

        return DB::connection('mongodb')->transaction(
            function () use ($employee, $employeeId, $outletId, $session, $operationalDate, $data, $idempotencyKey): Stopmeter {
                $state = OutletMeterState::where('outlet_id', $outletId)->first();

                if ($state) {
                    $rInitial = (int) $state->r_current;
                    $mInitial = (int) $state->m_current;
                } else {
                    // Stopmeter pertama untuk outlet ini: belum ada state, jadi
                    // bacaan awal wajib dikirim dan dicatat sebagai baseline.
                    if (! isset($data['r_initial'], $data['m_initial'])) {
                        throw new InvalidMeterReadingException(
                            'Bacaan awal R dan M wajib diisi untuk Stopmeter pertama pada outlet ini.'
                        );
                    }

                    $rInitial = (int) $data['r_initial'];
                    $mInitial = (int) $data['m_initial'];
                }

                $result = $this->calculator->calculate([
                    'r_initial' => $rInitial,
                    'r_current' => $data['r_current'],
                    'm_initial' => $mInitial,
                    'm_current' => $data['m_current'],
                    'bi' => $data['bi'] ?? 0,
                    'dp' => $data['dp'] ?? 0,
                    'vc' => $data['vc'] ?? 0,
                    'inch_in' => $data['inch_in'] ?? 0,
                    'inch_out' => $data['inch_out'] ?? 0,
                ]);

                $stopmeter = $this->storeFinalRecord(
                    $employee,
                    $employeeId,
                    $outletId,
                    $session,
                    $operationalDate,
                    $result,
                    $data,
                    $idempotencyKey
                );

                $this->carryForwardMeterState($state, $outletId, $stopmeter, $result);

                ActivityLogger::log(
                    'stopmeter.finalized',
                    'stopmeter',
                    $stopmeter->_id,
                    sprintf(
                        'Stopmeter %s %s oleh %s difinalisasi (total limit %d, sales net %d).',
                        $session,
                        $operationalDate->toDateString(),
                        $employee->name,
                        $result['total_limit'],
                        $result['sales_net']
                    ),
                    [
                        'outlet_id' => $outletId,
                        'operational_date' => $operationalDate->toDateString(),
                        'session' => $session,
                        'total_limit' => $result['total_limit'],
                        'sales_net' => $result['sales_net'],
                    ]
                );

                return $stopmeter;
            }
        );
    }

    /**
     * @param  array<string, int>  $result
     * @param  array<string, mixed>  $data
     */
    private function storeFinalRecord(
        User $employee,
        string $employeeId,
        string $outletId,
        string $session,
        Carbon $operationalDate,
        array $result,
        array $data,
        ?string $idempotencyKey
    ): Stopmeter {
        try {
            $attributes = [
                'outlet_id' => $outletId,
                'employee_id' => $employeeId,
                'employee_name' => $employee->name,
                'operational_date' => $operationalDate,
                'session' => $session,
                'status' => 'final',
                'r_initial' => $result['r_initial'],
                'r_current' => $result['r_current'],
                'm_initial' => $result['m_initial'],
                'm_current' => $result['m_current'],
                'r_used' => $result['r_used'],
                'm_used' => $result['m_used'],
                'total_limit' => $result['total_limit'],
                'bi' => $result['bi'],
                'dp' => $result['dp'],
                'vc' => $result['vc'],
                'inch_in' => $result['inch_in'],
                'inch_out' => $result['inch_out'],
                'sales_net' => $result['sales_net'],
                'notes' => $data['notes'] ?? null,
                'finalized_at' => now(),
            ];

            if ($idempotencyKey !== null) {
                // Hanya ditulis bila ada. Index unik bersifat sparse, sehingga
                // dokumen tanpa field ini tidak dianggap duplikat satu sama lain.
                $attributes['idempotency_key'] = $idempotencyKey;
            }

            return Stopmeter::create($attributes);
        } catch (Throwable $exception) {
            // Unique index (outlet_id, employee_id, operational_date, session)
            // atau idempotency_key menolak duplikat. Tipe exception driver bisa
            // berbeda antar versi paket, jadi dideteksi dari kode/pesan.
            if ($this->isDuplicateKeyError($exception)) {
                throw new StopmeterConflictException(
                    'Stopmeter untuk shift ini sudah tercatat. Muat ulang data sebelum submit lagi.'
                );
            }

            throw $exception;
        }
    }

    private function isDuplicateKeyError(Throwable $exception): bool
    {
        if ($exception->getCode() === 11000) {
            return true;
        }

        $message = $exception->getMessage();

        return str_contains($message, 'E11000')
            || str_contains($message, 'duplicate key');
    }

    /**
     * @param  array<string, int>  $result
     */
    private function carryForwardMeterState(
        ?OutletMeterState $state,
        string $outletId,
        Stopmeter $stopmeter,
        array $result
    ): void {
        if ($state === null) {
            OutletMeterState::create([
                'outlet_id' => $outletId,
                'r_current' => $result['r_current'],
                'm_current' => $result['m_current'],
                'version' => 1,
                'last_stopmeter_id' => (string) $stopmeter->_id,
            ]);

            return;
        }

        $expectedVersion = (int) $state->version;

        $affected = OutletMeterState::where('_id', $state->_id)
            ->where('version', $expectedVersion)
            ->update([
                'r_current' => $result['r_current'],
                'm_current' => $result['m_current'],
                'version' => $expectedVersion + 1,
                'last_stopmeter_id' => (string) $stopmeter->_id,
                'updated_at' => now(),
            ]);

        if ($affected === 0) {
            // Ada finalisasi lain yang lebih dulu memindahkan meter.
            throw new StopmeterConflictException(
                'Meter outlet berubah saat proses submit. Muat ulang lalu submit ulang.'
            );
        }
    }

    private function ensureEmployeeAssignedToOutlet(User $employee, string $outletId): void
    {
        $assigned = array_map('strval', $employee->outlet_ids ?? []);

        if (! in_array($outletId, $assigned, true)) {
            throw new AuthorizationException('Anda tidak ditugaskan pada outlet ini.');
        }
    }

    /**
     * Tanggal operasional disimpan sebagai tengah malam UTC dari tanggal kalender.
     * Tujuannya agar tanggal yang dibaca frontend tidak bergeser oleh zona waktu.
     */
    public function normalizeOperationalDate(string $date): Carbon
    {
        $date = trim($date);

        if ($date === '') {
            $date = Carbon::now(self::OPERATIONAL_TIMEZONE)->toDateString();
        }

        return Carbon::createFromFormat('Y-m-d', $date, 'UTC')->startOfDay();
    }

    private function normalizeIdempotencyKey(mixed $key): ?string
    {
        if (! is_string($key)) {
            return null;
        }

        $key = trim($key);

        return $key === '' ? null : $key;
    }
}

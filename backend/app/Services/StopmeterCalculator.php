<?php

namespace App\Services;

use App\Exceptions\InvalidMeterReadingException;

/**
 * Perhitungan Stopmeter di sisi server.
 *
 * ATURAN (konfirmasi bisnis 2026-11-05):
 * - Satu Stopmeter = satu shift (Pagi/Malam) milik satu employee pada satu outlet.
 * - R/M awal TIDAK diinput employee; nilainya diambil dari state meter outlet
 *   (hasil finalisasi shift sebelumnya). Employee hanya mengisi bacaan akhir.
 * - BI = bank in: uang yang ditransfer customer langsung ke office.
 *   Dicatat sebagai angka POSITIF dan MENGURANGI sales_net, sesuai contoh
 *   perhitungan yang sudah tampil di aplikasi.
 *
 * Rumus:
 *   r_used       = r_current - r_initial
 *   m_used       = m_current - m_initial
 *   total_limit  = r_used + m_used
 *   sales_net    = total_limit + dp + inch_in - bi - inch_out - vc
 *
 * Ket: total_limit bukan profit. sales_net mencampurkan limit terpakai dengan
 * perpindahan uang Inchas, jadi jangan dipakai sebagai indikator laba/rugi.
 */
class StopmeterCalculator
{
    /**
     * @param  array<string, mixed>  $input
     * @return array<string, int>
     */
    public function calculate(array $input): array
    {
        $rInitial = (int) ($input['r_initial'] ?? 0);
        $rCurrent = (int) ($input['r_current'] ?? 0);
        $mInitial = (int) ($input['m_initial'] ?? 0);
        $mCurrent = (int) ($input['m_current'] ?? 0);

        if ($rCurrent < $rInitial) {
            throw new InvalidMeterReadingException(
                'Bacaan akhir R tidak boleh lebih kecil dari bacaan awal R.'
            );
        }

        if ($mCurrent < $mInitial) {
            throw new InvalidMeterReadingException(
                'Bacaan akhir M tidak boleh lebih kecil dari bacaan awal M.'
            );
        }

        $rUsed = $rCurrent - $rInitial;
        $mUsed = $mCurrent - $mInitial;
        $totalLimit = $rUsed + $mUsed;

        $bi = (int) ($input['bi'] ?? 0);
        $dp = (int) ($input['dp'] ?? 0);
        $vc = (int) ($input['vc'] ?? 0);
        $inchIn = (int) ($input['inch_in'] ?? 0);
        $inchOut = (int) ($input['inch_out'] ?? 0);

        return [
            'r_initial' => $rInitial,
            'r_current' => $rCurrent,
            'm_initial' => $mInitial,
            'm_current' => $mCurrent,
            'r_used' => $rUsed,
            'm_used' => $mUsed,
            'total_limit' => $totalLimit,
            'bi' => $bi,
            'dp' => $dp,
            'vc' => $vc,
            'inch_in' => $inchIn,
            'inch_out' => $inchOut,
            'sales_net' => $totalLimit + $dp + $inchIn - $bi - $inchOut - $vc,
        ];
    }
}

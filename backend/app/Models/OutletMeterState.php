<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

/**
 * State meter terakhir per outlet.
 *
 * Satu dokumen per outlet. `r_current`/`m_current` di sini adalah bacaan akhir
 * dari Stopmeter terakhir yang sudah difinalisasi, dan menjadi bacaan AWAL untuk
 * shift berikutnya. `version` dipakai untuk optimistic locking supaya dua
 * finalisasi bersamaan tidak saling menimpa.
 */
class OutletMeterState extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'outlet_meter_states';

    protected $fillable = [
        'outlet_id',
        'r_current',
        'm_current',
        'version',
        'last_stopmeter_id',
    ];

    protected function casts(): array
    {
        return [
            'r_current' => 'integer',
            'm_current' => 'integer',
            'version' => 'integer',
        ];
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Membuat index MongoDB yang dibutuhkan modul Stopmeter.
 *
 * Idempoten: createIndex dengan nama yang sama tidak mengubah apa pun.
 * Jalankan sekali setelah deploy, lalu setiap kali ada index baru:
 *   php artisan stopmeter:ensure-indexes
 */
class EnsureStopmeterIndexes extends Command
{
    protected $signature = 'stopmeter:ensure-indexes';

    protected $description = 'Buat index MongoDB untuk Stopmeter, state meter, dan activity log.';

    /**
     * @var array<string, list<array{keys: array<string, int>, options: array<string, mixed>}>>
     */
    private const INDEXES = [
        'stopmeters' => [
            [
                'keys' => ['outlet_id' => 1, 'operational_date' => -1],
                'options' => ['name' => 'stopmeters_outlet_operational_date'],
            ],
            [
                'keys' => ['employee_id' => 1, 'created_at' => -1],
                'options' => ['name' => 'stopmeters_employee_created_at'],
            ],
            [
                'keys' => [
                    'outlet_id' => 1,
                    'employee_id' => 1,
                    'operational_date' => 1,
                    'session' => 1,
                ],
                'options' => ['name' => 'stopmeters_unique_shift_per_employee', 'unique' => true],
            ],
            [
                'keys' => ['idempotency_key' => 1],
                'options' => ['name' => 'stopmeters_idempotency_key', 'unique' => true, 'sparse' => true],
            ],
        ],
        'outlet_meter_states' => [
            [
                'keys' => ['outlet_id' => 1],
                'options' => ['name' => 'outlet_meter_states_unique_outlet', 'unique' => true],
            ],
        ],
        'activity_logs' => [
            [
                'keys' => ['created_at' => -1],
                'options' => ['name' => 'activity_logs_created_at'],
            ],
        ],
    ];

    public function handle(): int
    {
        $database = DB::connection('mongodb')->getMongoDB();
        $failed = false;

        foreach (self::INDEXES as $collectionName => $definitions) {
            $collection = $database->selectCollection($collectionName);

            foreach ($definitions as $definition) {
                try {
                    $collection->createIndex($definition['keys'], $definition['options']);
                    $this->info(sprintf(
                        '%s: index %s siap.',
                        $collectionName,
                        $definition['options']['name']
                    ));
                } catch (Throwable $exception) {
                    $failed = true;
                    $this->error(sprintf(
                        '%s: gagal membuat index %s — %s',
                        $collectionName,
                        $definition['options']['name'],
                        $exception->getMessage()
                    ));

                    if (str_contains($exception->getMessage(), 'duplicate key')) {
                        $this->warn(
                            'Ada data duplikat. Bersihkan duplikatnya dulu, lalu jalankan ulang perintah ini.'
                        );
                    }
                }
            }
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Proyek ini memakai MongoDB tanpa migration, jadi satu-satunya data awal
     * yang dibutuhkan adalah akun + outlet demo. Tidak ada factory untuk User.
     */
    public function run(): void
    {
        $this->call(DemoDataSeeder::class);
    }
}

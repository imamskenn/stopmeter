<?php

namespace Database\Seeders;

use App\Models\Outlet;
use App\Models\OutletMeterState;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Data demo untuk pengujian manual: satu outlet, satu Admin, satu Employee.
 *
 * Idempoten: aman dijalankan berkali-kali.
 * - Akun yang sudah ada hanya dirapikan (nama, role, outlet, status aktif),
 *   password-nya TIDAK diubah.
 * - Baseline meter outlet hanya dibuat bila outlet belum punya state, supaya
 *   meter yang sudah berjalan tidak ter-reset.
 */
class DemoDataSeeder extends Seeder
{
    private const OUTLET_CODE = 'OUT-DEMO';

    private const ADMIN_EMAIL = 'admin.demo@stopmeter.test';

    private const EMPLOYEE_EMAIL = 'employee.demo@stopmeter.test';

    public function run(): void
    {
        // getenv() dipakai supaya tetap terbaca walau config di-cache.
        $password = getenv('DEMO_PASSWORD') ?: 'StopmeterDemo#26';

        $outlet = $this->ensureOutlet();
        $outletId = (string) $outlet->_id;

        $metersSeeded = $this->ensureMeterBaseline($outletId);

        $admin = $this->ensureUser(
            self::ADMIN_EMAIL,
            'Admin Demo',
            'admin',
            [$outletId],
            $password
        );

        $employee = $this->ensureUser(
            self::EMPLOYEE_EMAIL,
            'Employee Demo',
            'employee',
            [$outletId],
            $password
        );

        if ($this->command === null) {
            return;
        }

        $this->command->info('Data demo Stopmeter siap.');
        $this->command->table(
            ['Peran', 'Email', 'Password'],
            [
                ['admin', $admin->email, $password],
                ['employee', $employee->email, $password],
            ]
        );
        $this->command->line(sprintf(
            'Outlet: %s (%s) — id %s',
            $outlet->name,
            $outlet->code,
            $outletId
        ));
        $this->command->line(sprintf(
            'Baseline meter: %s',
            $metersSeeded
                ? 'dibuat (R 1000 / M 500)'
                : 'dilewati, outlet sudah punya state meter'
        ));
        $this->command->line('Password di atas hanya dipakai saat akun pertama kali dibuat.');
        $this->command->warn(
            'Akun demo ini hanya untuk pengujian. Hapus atau ganti password sebelum dipakai sungguhan.'
        );
        $this->command->line('Ganti password awal dengan env DEMO_PASSWORD saat menjalankan seeder.');
    }

    private function ensureOutlet(): Outlet
    {
        $outlet = Outlet::where('code', self::OUTLET_CODE)->first();

        if ($outlet === null) {
            return Outlet::create([
                'name' => 'Outlet Demo Utama',
                'code' => self::OUTLET_CODE,
                'address' => 'Petaling Jaya, Selangor',
                'is_active' => true,
            ]);
        }

        // Nama/alamat tidak ditimpa; hanya status yang dipastikan aktif.
        $outlet->update(['is_active' => true]);

        return $outlet;
    }

    private function ensureMeterBaseline(string $outletId): bool
    {
        if (OutletMeterState::where('outlet_id', $outletId)->exists()) {
            return false;
        }

        OutletMeterState::create([
            'outlet_id' => $outletId,
            'r_current' => 1000,
            'm_current' => 500,
            'version' => 1,
            'last_stopmeter_id' => null,
        ]);

        return true;
    }

    /**
     * @param  list<string>  $outletIds
     */
    private function ensureUser(
        string $email,
        string $name,
        string $role,
        array $outletIds,
        string $password
    ): User {
        $user = User::where('email', $email)->first();

        if ($user === null) {
            return User::create([
                'name' => $name,
                'email' => $email,
                // Di-hash otomatis oleh cast 'hashed' pada model User.
                'password' => $password,
                'role' => $role,
                'outlet_ids' => $outletIds,
                'is_active' => true,
            ]);
        }

        $user->update([
            'name' => $name,
            'role' => $role,
            'outlet_ids' => $outletIds,
            'is_active' => true,
        ]);

        return $user;
    }
}

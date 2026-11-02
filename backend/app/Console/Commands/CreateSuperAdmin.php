<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateSuperAdmin extends Command
{
    protected $signature = 'stopmeter:create-super-admin';

    protected $description = 'Create the first Stopmeter Super Admin';

    public function handle(): int
    {
        $name = $this->ask('Nama Super Admin');
        $email = strtolower(trim($this->ask('Email Super Admin')));

        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Nama atau email tidak valid.');
            return self::FAILURE;
        }

        if (User::where('email', $email)->exists()) {
            $this->error('Email sudah terdaftar.');
            return self::FAILURE;
        }

        $password = $this->secret('Password');
        $confirmation = $this->secret('Ulangi password');

        if (!$password || strlen($password) < 12 || $password !== $confirmation) {
            $this->error('Password minimal 12 karakter dan harus sama.');
            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => 'super_admin',
            'outlet_ids' => [],
            'is_active' => true,
        ]);

        $this->info('Super Admin berhasil dibuat.');

        return self::SUCCESS;
    }
}

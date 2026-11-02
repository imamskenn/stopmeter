<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Outlet extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'outlets';

    protected $fillable = [
        'name',
        'code',
        'address',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }
}

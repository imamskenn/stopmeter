<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Stopmeter extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'stopmeters';

    protected $fillable = [
        'outlet_id',
        'employee_id',
        'employee_name',
        'operational_date',
        'session',
        'status',
        'r_initial',
        'r_current',
        'r_used',
        'm_initial',
        'm_current',
        'm_used',
        'bi',
        'dp',
        'inch_in',
        'inch_out',
        'inch_in_admin_id',
        'inch_in_admin_name',
        'inch_out_admin_id',
        'inch_out_admin_name',
        'vc',
        'total_limit',
        'sales_net',
        'notes',
        'idempotency_key',
        'finalized_at',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'r_initial' => 'integer',
            'r_current' => 'integer',
            'r_used' => 'integer',
            'm_initial' => 'integer',
            'm_current' => 'integer',
            'm_used' => 'integer',
            'bi' => 'integer',
            'dp' => 'integer',
            'inch_in' => 'integer',
            'inch_out' => 'integer',
            'vc' => 'integer',
            'total_limit' => 'integer',
            'sales_net' => 'integer',
            'operational_date' => 'date',
            'finalized_at' => 'datetime',
        ];
    }
}

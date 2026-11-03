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
        'm_initial',
        'm_current',
        'bi',
        'dp',
        'inch_in',
        'inch_out',
        'vc',
        'total_limit',
        'sales_net',
        'finalized_at',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'r_initial' => 'integer',
            'r_current' => 'integer',
            'm_initial' => 'integer',
            'm_current' => 'integer',
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

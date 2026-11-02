<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;
use MongoDB\Laravel\Eloquent\HybridRelations;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use HybridRelations;

    protected $connection = 'mongodb';
    protected $collection = 'personal_access_tokens';
}

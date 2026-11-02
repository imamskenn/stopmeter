<?php

namespace App\Models;

use Laravel\Sanctum\Contracts\HasAbilities;
use MongoDB\Laravel\Eloquent\Model;

class PersonalAccessToken extends Model implements HasAbilities
{
    protected $connection = 'mongodb';

    protected $collection = 'personal_access_tokens';

    protected $fillable = [
        'name',
        'token',
        'abilities',
        'expires_at',
    ];

    protected $hidden = [
        'token',
    ];

    protected function casts(): array
    {
        return [
            'abilities' => 'array',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function tokenable()
    {
        return $this->morphTo('tokenable');
    }

    public static function findToken($token)
    {
        if (! str_contains($token, '|')) {
            return static::where('token', hash('sha256', $token))->first();
        }

        [$id, $plainTextToken] = explode('|', $token, 2);

        $instance = static::find($id);

        if (! $instance) {
            return null;
        }

        return hash_equals(
            $instance->token,
            hash('sha256', $plainTextToken)
        ) ? $instance : null;
    }

    public function can($ability)
    {
        return in_array('*', $this->abilities ?? [], true)
            || in_array($ability, $this->abilities ?? [], true);
    }

    public function cant($ability)
    {
        return ! $this->can($ability);
    }
}

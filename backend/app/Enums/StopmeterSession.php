<?php

namespace App\Enums;

enum StopmeterSession: string
{
    case PAGI = 'Pagi';
    case MALAM = 'Malam';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $case): string => $case->value,
            self::cases()
        );
    }
}

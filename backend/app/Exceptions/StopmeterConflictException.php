<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Konflik operasional: submit ganda, shift yang sama sudah final,
 * atau state meter berubah saat finalisasi berlangsung.
 */
class StopmeterConflictException extends RuntimeException
{
}

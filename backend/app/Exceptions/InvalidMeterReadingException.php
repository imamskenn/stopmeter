<?php

namespace App\Exceptions;

use InvalidArgumentException;

/**
 * Bacaan meter tidak valid (mis. bacaan awal wajib diisi tetapi tidak dikirim).
 */
class InvalidMeterReadingException extends InvalidArgumentException
{
}

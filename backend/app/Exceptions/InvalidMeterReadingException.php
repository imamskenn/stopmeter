<?php

namespace App\Exceptions;

use InvalidArgumentException;

/**
 * Bacaan meter tidak valid (mis. meter akhir lebih kecil dari meter awal).
 */
class InvalidMeterReadingException extends InvalidArgumentException
{
}

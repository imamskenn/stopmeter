<?php

namespace Tests\Unit;

use App\Services\StopmeterCalculator;
use PHPUnit\Framework\TestCase;

class StopmeterCalculatorTest extends TestCase
{
    public function test_it_reproduces_the_business_example(): void
    {
        $result = (new StopmeterCalculator())->calculate([
            'r_initial' => 500,
            'r_current' => 1000,
            'm_initial' => 500,
            'm_current' => 1000,
            'bi' => 100,
            'dp' => 500,
            'vc' => 10,
            'inch_in' => 200,
            'inch_out' => 50,
        ]);

        $this->assertSame(500, $result['r_used']);
        $this->assertSame(500, $result['m_used']);
        $this->assertSame(1000, $result['total_limit']);
        // 1000 + 500 + 200 - 100 (bank in) - 50 - 10
        $this->assertSame(1540, $result['sales_net']);
    }

    public function test_r_and_m_are_kept_separate(): void
    {
        $result = (new StopmeterCalculator())->calculate([
            'r_initial' => 100,
            'r_current' => 300,
            'm_initial' => 0,
            'm_current' => 50,
        ]);

        $this->assertSame(200, $result['r_used']);
        $this->assertSame(50, $result['m_used']);
        $this->assertSame(250, $result['total_limit']);
    }

    public function test_meter_difference_may_be_negative(): void
    {
        // Bacaan akhir lebih kecil dari bacaan awal bukan lagi error: selisihnya
        // dibiarkan minus, bukan di-clamp ke 0.
        $result = (new StopmeterCalculator())->calculate([
            'r_initial' => 1000,
            'r_current' => 999,
            'm_initial' => 50,
            'm_current' => 40,
        ]);

        $this->assertSame(-1, $result['r_used']);
        $this->assertSame(-10, $result['m_used']);
        $this->assertSame(-11, $result['total_limit']);
        $this->assertSame(-11, $result['sales_net']);
    }

    public function test_optional_money_fields_default_to_zero(): void
    {
        $result = (new StopmeterCalculator())->calculate([
            'r_initial' => 0,
            'r_current' => 100,
            'm_initial' => 0,
            'm_current' => 50,
        ]);

        $this->assertSame(150, $result['total_limit']);
        $this->assertSame(150, $result['sales_net']);
        $this->assertSame(0, $result['bi']);
        $this->assertSame(0, $result['inch_out']);
    }
}

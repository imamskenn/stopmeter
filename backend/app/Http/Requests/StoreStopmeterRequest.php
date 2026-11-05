<?php

namespace App\Http\Requests;

use App\Enums\StopmeterSession;
use App\Services\StopmeterFinalizer;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStopmeterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'employee';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'string', 'max:64'],
            'session' => ['required', 'string', Rule::in(StopmeterSession::values())],
            'operational_date' => ['required', 'date_format:Y-m-d'],

            'r_current' => ['required', 'integer', 'min:0'],
            'm_current' => ['required', 'integer', 'min:0'],

            // Hanya dipakai untuk Stopmeter pertama pada outlet yang belum punya
            // state meter. Untuk shift berikutnya nilai ini diabaikan.
            'r_initial' => ['sometimes', 'integer', 'min:0'],
            'm_initial' => ['sometimes', 'integer', 'min:0'],

            'bi' => ['sometimes', 'integer', 'min:0'],
            'dp' => ['sometimes', 'integer', 'min:0'],
            'vc' => ['sometimes', 'integer', 'min:0'],
            'inch_in' => ['sometimes', 'integer', 'min:0'],
            'inch_out' => ['sometimes', 'integer', 'min:0'],

            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'idempotency_key' => ['sometimes', 'nullable', 'string', 'max:128'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'operational_date' => $this->input('operational_date')
                ?: Carbon::now(StopmeterFinalizer::OPERATIONAL_TIMEZONE)->toDateString(),
            'idempotency_key' => $this->input('idempotency_key')
                ?: $this->header('Idempotency-Key'),
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'outlet_id.required' => 'Outlet wajib dipilih.',
            'session.required' => 'Shift wajib dipilih (Pagi atau Malam).',
            'session.in' => 'Shift harus Pagi atau Malam.',
            'r_current.required' => 'Bacaan akhir R wajib diisi.',
            'm_current.required' => 'Bacaan akhir M wajib diisi.',
            'r_current.min' => 'Bacaan R tidak boleh negatif.',
            'm_current.min' => 'Bacaan M tidak boleh negatif.',
        ];
    }
}

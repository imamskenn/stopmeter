<?php

namespace App\Http\Requests;

use App\Enums\StopmeterSession;
use App\Services\StopmeterFinalizer;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

            // Inchas in/out dicatat atas nama admin (Inchas) yang menangani
            // uangnya. Wajib dipilih kalau nominalnya lebih dari 0.
            'inch_in_admin_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'inch_out_admin_id' => ['sometimes', 'nullable', 'string', 'max:64'],

            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
            'idempotency_key' => ['sometimes', 'nullable', 'string', 'max:128'],
        ];
    }

    /**
     * Nominal Inchas in/out tanpa nama admin tidak boleh lolos, karena uangnya
     * harus bisa ditelusuri ke Inchas yang menangani.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach (['inch_in' => 'Inchas in', 'inch_out' => 'Inchas out'] as $field => $label) {
                $amount = (int) $this->input($field, 0);
                $adminId = trim((string) $this->input("{$field}_admin_id", ''));

                if ($amount > 0 && $adminId === '') {
                    $validator->errors()->add(
                        "{$field}_admin_id",
                        "Pilih admin (Inchas) yang menangani {$label}."
                    );
                }
            }
        });
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
            'inch_in_admin_id.max' => 'Admin untuk Inchas in tidak valid.',
            'inch_out_admin_id.max' => 'Admin untuk Inchas out tidak valid.',
        ];
    }
}

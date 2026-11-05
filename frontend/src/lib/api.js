// Dipakai kalau VITE_API_URL tidak di-set (mis. env Vercel lupa diisi), supaya
// request tidak pernah menuju "undefined/login".
const FALLBACK_API_URL = 'https://stopmeter-api.onrender.com/api';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();

if (!configuredApiUrl) {
    console.warn(
        `VITE_API_URL tidak di-set, memakai API default: ${FALLBACK_API_URL}`
    );
}

export const API_URL = (configuredApiUrl || FALLBACK_API_URL).replace(/\/+$/, '');

// Event global untuk sesi yang tidak valid lagi (token kedaluwarsa/dicabut).
// App.jsx & EmployeeApp.jsx mendengarkan event ini lalu kembali ke layar login.
export const UNAUTHORIZED_EVENT = 'stopmeter:unauthorized';

export async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('stopmeter_token');

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        // 401 saat login = kredensial salah, bukan sesi berakhir, jadi jangan
        // memicu logout global untuk request /login.
        if (response.status === 401 && token && path !== '/login') {
            localStorage.removeItem('stopmeter_token');
            window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }

        throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
}

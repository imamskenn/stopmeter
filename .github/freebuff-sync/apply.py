#!/usr/bin/env python3
"""Patch sekali pakai: handling 401 global + fallback VITE_API_URL.

Dijalankan oleh workflow .github/workflows/freebuff-sync.yml, lalu menghapus
file bantu ini di commit yang sama.
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "frontend" / "src"
API = SRC / "lib" / "api.js"
APP = SRC / "App.jsx"
EMP = SRC / "EmployeeApp.jsx"

API_NEW = r"""// Dipakai kalau VITE_API_URL tidak di-set (mis. env Vercel lupa diisi), supaya
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
"""

IMPORT_OLD = "import { apiRequest } from './lib/api';"
IMPORT_NEW = "import { apiRequest, UNAUTHORIZED_EVENT } from './lib/api';"


def guard_block(state_reset):
    return (
        "  useEffect(() => {\n"
        "    function handleUnauthorized() {\n"
        "      setUser(null);\n"
        "      setPassword('');\n"
        "      setError('Sesi Anda berakhir. Silakan masuk lagi.');\n"
        f"      {state_reset}\n"
        "    }\n\n"
        "    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);\n\n"
        "    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);\n"
        "  }, []);\n\n"
    )


def session_anchor(flag):
    return (
        "  useEffect(() => {\n"
        "    const token = localStorage.getItem('stopmeter_token');\n\n"
        "    if (!token) {\n"
        f"      {flag}\n"
        "      return;\n"
        "    }\n"
    )


PATCHES = {
    APP: [
        (IMPORT_OLD, IMPORT_NEW),
        (session_anchor("setLoading(false);"),
         guard_block("setLoading(false);") + session_anchor("setLoading(false);")),
    ],
    EMP: [
        (IMPORT_OLD, IMPORT_NEW),
        (session_anchor("setChecking(false);"),
         guard_block("setChecking(false);") + session_anchor("setChecking(false);")),
    ],
}


def patch(path, pairs):
    text = path.read_bytes().decode("utf-8")

    for old, new in pairs:
        found = text.count(old)

        if found != 1:
            sys.exit("FAIL %s: %d anchor (%r)" % (path.name, found, old[:60]))

        text = text.replace(old, new, 1)

    path.write_bytes(text.encode("utf-8"))
    print("OK", path.relative_to(ROOT))


for target, pairs in PATCHES.items():
    patch(target, pairs)

API.write_bytes(API_NEW.encode("utf-8"))
print("OK", API.relative_to(ROOT))

shutil.rmtree(ROOT / ".github" / "freebuff-sync", ignore_errors=True)
(ROOT / ".github" / "workflows" / "freebuff-sync.yml").unlink(missing_ok=True)
print("helper files removed")

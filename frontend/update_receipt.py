from pathlib import Path
import re
import shutil

p = Path("src/App.jsx")
s = p.read_text()

backup = Path("src/App.jsx.before-opencv-integration")
shutil.copy2(p, backup)

def require(condition, message):
    if not condition:
        raise SystemExit("GAGAL: " + message + ". File asli tetap aman.")

# Rapikan import
s = s.replace(
    "const ReceiptCamera = lazy(() => import('./ReceiptCamera'));\n"
    "import { lazy, Suspense, useEffect, useMemo, useState } from 'react';",
    "import { lazy, Suspense, useEffect, useMemo, useState } from 'react';\n"
    "const ReceiptCamera = lazy(() => import('./ReceiptCamera'));"
)
s = s.replace("import { createWorker } from 'tesseract.js';\n", "")

# Hapus helper OCR
s, n = re.subn(
    r"\nfunction extractReceiptTotal\(text\) \{.*?\n\}\s*(?=const initialOutlets)",
    "\n",
    s,
    count=1,
    flags=re.S
)
require(n == 1, "Helper OCR tidak ditemukan")

# Hapus state OCR
for line in [
    "  const [ocrLoading, setOcrLoading] = useState(false);\n",
    "  const [ocrMessage, setOcrMessage] = useState('');\n",
    "  const [ocrText, setOcrText] = useState('');\n"
]:
    require(line in s, "State OCR tidak ditemukan")
    s = s.replace(line, "", 1)

# Tambah state kamera
needle = "  const [receiptFile, setReceiptFile] = useState(null);\n"
require(needle in s, "State receiptFile tidak ditemukan")
s = s.replace(
    needle,
    needle + "  const [showReceiptCamera, setShowReceiptCamera] = useState(false);\n",
    1
)

# Hapus fungsi scanReceipt
start = s.find("  const scanReceipt = async file => {")
end = s.find("  const [activities", start)
require(start != -1 and end != -1, "Fungsi OCR tidak ditemukan")
s = s[:start] + s[end:]

# Ganti tombol foto dan galeri
anchor = s.find("Ambil foto atau pilih dari galeri")
start = s.find("                <label style={{", anchor)
end = s.find("              {receiptFile && (", start)
require(anchor != -1 and start != -1 and end != -1, "Tombol foto tidak ditemukan")

buttons = """                <button
                  type="button"
                  onClick={() => setShowReceiptCamera(true)}
                  style={{
                    padding: 12,
                    border: 0,
                    borderRadius: 9,
                    background: '#172f59',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  Scan Kamera
                </button>
                <label style={{
                  padding: 12,
                  borderRadius: 9,
                  background: '#eaf0f8',
                  color: '#172f59',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  Pilih Galeri
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
"""
s = s[:start] + buttons + s[end:]

# Ganti panel OCR dengan petunjuk manual
start = s.find("            <div style={{", s.find("value={receiptAmount}"))
end = s.find('            <button\n              type="submit"', start)
require(start != -1 and end != -1, "Panel OCR tidak ditemukan")

hint = """            <p style={{
              fontSize: 11,
              color: '#68758b',
              marginBottom: 16
            }}>
              Nominal resit diisi manual sesuai jumlah pada foto.
            </p>

"""
s = s[:start] + hint + s[end:]

# Tambahkan modal scanner
marker = "\n    </main>\n  );\n}\n\nfunction App"
require(marker in s, "Lokasi modal scanner tidak ditemukan")

modal = """
      {showReceiptCamera && (
        <Suspense fallback={
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: '#101828ee',
            color: '#fff',
            display: 'grid',
            placeItems: 'center'
          }}>
            Menyiapkan scanner OpenCV...
          </div>
        }>
          <ReceiptCamera
            onCapture={file => {
              setReceiptFile(file);
              setShowReceiptCamera(false);
            }}
            onClose={() => setShowReceiptCamera(false)}
          />
        </Suspense>
      )}
"""
s = s.replace(marker, "\n" + modal + marker, 1)

s = s.replace(
    "Tampilan frontend. Pengiriman ke Super Admin, OCR, dan pemotongan deposit belum aktif.",
    "Tampilan frontend. Pengiriman ke Super Admin dan pemotongan deposit belum aktif."
)

p.write_text(s)
print("Integrasi kamera selesai.")
print("Backup:", backup)

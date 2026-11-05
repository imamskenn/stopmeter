from pathlib import Path
import re
import shutil

p = Path("src/App.jsx")
s = p.read_text()
shutil.copy2(p, "src/App.jsx.before-remove-scanner")

# Hapus lazy import scanner
s = s.replace(
    "const ReceiptCamera = lazy(() => import('./ReceiptCamera'));\n", ""
)
s = s.replace(
    "import { lazy, Suspense, useEffect, useMemo, useState } from 'react';",
    "import { useEffect, useMemo, useState } from 'react';"
)

# Hapus state scanner
s = s.replace(
    "  const [showReceiptCamera, setShowReceiptCamera] = useState(false);\n", ""
)

# Ganti tombol scanner dan galeri dengan kamera biasa dan galeri
pattern = r'                <button\s+type="button"\s+onClick=\{\(\) => setShowReceiptCamera\(true\)\}.*?</div>\n(?=\s*\{receiptFile && \()'

replacement = """                <label style={{
                  padding: 12,
                  borderRadius: 9,
                  background: '#172f59',
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  Ambil Foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
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

s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("Gagal mengganti tombol kamera. File asli belum ditulis.")

# Hapus modal scanner
s, n = re.subn(
    r'\n\s*\{showReceiptCamera && \(.*?\n\s*\)\}\n(?=\s*</main>)',
    '\n',
    s,
    count=1,
    flags=re.S
)
if n != 1:
    raise SystemExit("Gagal menghapus modal scanner. File asli belum ditulis.")

p.write_text(s)
print("Kamera biasa dan galeri berhasil dipasang.")
print("Backup: src/App.jsx.before-remove-scanner")

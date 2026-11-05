import pathlib
import sys

path = pathlib.Path('frontend/src/App.jsx')
source = path.read_text(encoding='utf-8')

anchor = "  const formatBI = value => new Intl.NumberFormat('id-ID').format(value);\n"

if source.count(anchor) != 1:
    sys.exit(f'anchor tidak ditemukan tepat 1x (dapat {source.count(anchor)})')

if 'const byBI =' in source:
    sys.exit('byBI sudah dideklarasikan, patch tidak diperlukan')

replacement = (
    '  const byBI = [...outletRankings].sort((a, b) => b.biTotal - a.biTotal);\n'
    '\n'
    + anchor
)

updated = source.replace(anchor, replacement)
path.write_text(updated, encoding='utf-8')
print(f'App.jsx diperbarui: {len(updated)} byte')

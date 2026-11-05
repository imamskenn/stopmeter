import pathlib
import sys

path = pathlib.Path('frontend/src/App.jsx')
source = path.read_text(encoding='utf-8')

anchor = '  const byBI = [...outletRankings].sort((a, b) => b.biTotal - a.biTotal);\n'

if source.count(anchor) != 1:
    sys.exit(f'anchor tidak ditemukan tepat 1x (dapat {source.count(anchor)})')

replacement = (
    '  const byBI = [...outletRankings].sort(\n'
    '    (a, b) => b.biTotal - a.biTotal || a.name.localeCompare(b.name)\n'
    '  );\n'
)

updated = source.replace(anchor, replacement)
path.write_text(updated, encoding='utf-8')
print(f'App.jsx diperbarui: {len(updated)} byte')

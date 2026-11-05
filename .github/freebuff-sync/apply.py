import io
import os
import sys

PATH = 'frontend/src/App.jsx'
MARK = 'function InchasPanel({ data })'

COMPONENT = '''function InchasPanel({ data }) {
  const summary = data?.summary || [];
  const recent = data?.recent || [];
  const rm = value => new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(Number(value) || 0);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Inchas In/Out per Admin</h2>
          <p>Uang Inchas dicatat atas nama admin (Inchas) yang menangani.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ADMIN (INCHAS)</th>
              <th>INCHAS IN</th>
              <th>INCHAS OUT</th>
              <th>CATATAN</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(row => (
              <tr key={row.admin_id || row.admin_name || 'tanpa-nama'}>
                <td><b>{row.admin_name || 'Tanpa nama'}</b></td>
                <td>{rm(row.inch_in)}</td>
                <td>{rm(row.inch_out)}</td>
                <td>{row.records}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!summary.length && <div className="empty">Belum ada Inchas in/out yang tercatat.</div>}
      </div>

      {recent.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, margin: '18px 0 8px' }}>Catatan terbaru</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TANGGAL</th>
                  <th>OUTLET / KARYAWAN</th>
                  <th>INCHAS IN</th>
                  <th>INCHAS OUT</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(row => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.operational_date || '-'}</b>
                      <small className="subcell">{row.session}</small>
                    </td>
                    <td>
                      <b>{row.outlet_name}</b>
                      <small className="subcell">{row.employee_name}</small>
                    </td>
                    <td>
                      {row.inch_in > 0 ? (
                        <>
                          <b>{rm(row.inch_in)}</b>
                          <small className="subcell">{row.inch_in_admin_name || 'tanpa nama'}</small>
                        </>
                      ) : '-'}
                    </td>
                    <td>
                      {row.inch_out > 0 ? (
                        <>
                          <b>{rm(row.inch_out)}</b>
                          <small className="subcell">{row.inch_out_admin_name || 'tanpa nama'}</small>
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

'''

src = io.open(PATH, encoding='utf-8', newline='').read()

if MARK in src:
    print('sudah dipatch, tidak ada perubahan')
else:
    anchor_component = 'function Stat({ label, value, meta, icon })'
    assert src.count(anchor_component) == 1, 'anchor komponen tidak unik'
    src = src.replace(anchor_component, COMPONENT + anchor_component, 1)

    anchor_super = '    {showOutletRanking && ('
    assert src.count(anchor_super) == 1, 'anchor super admin tidak unik'
    src = src.replace(anchor_super, '    <InchasPanel data={stats?.inchas} />\n\n' + anchor_super, 1)

    anchor_admin = '      <section style={{ ...card, marginTop: 25 }}>'
    assert src.count(anchor_admin) == 1, 'anchor admin tidak unik'
    src = src.replace(anchor_admin, '      <InchasPanel data={data?.inchas} />\n\n' + anchor_admin, 1)

    io.open(PATH, 'w', encoding='utf-8', newline='').write(src)
    print('patched: panel Inchas ditambahkan')

# File bantu dibuang supaya tree main tetap bersih.
for helper in ['.github/freebuff-sync/apply.py', '.github/workflows/freebuff-sync.yml']:
    if os.path.exists(helper):
        os.remove(helper)

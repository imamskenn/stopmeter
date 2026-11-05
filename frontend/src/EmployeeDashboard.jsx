import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './lib/api';
import './EmployeeDashboard.css';

const money = value => new Intl.NumberFormat('ms-MY', {
  style: 'currency',
  currency: 'MYR',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const dateLabel = value => {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const emptyForm = {
  r_current: '',
  m_current: '',
  r_initial: '',
  m_initial: '',
  dp: '',
  vc: '',
  bi: '',
  inch_in: '',
  inch_out: '',
  inch_in_admin_id: '',
  inch_out_admin_id: '',
  notes: '',
};

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Tambahan di bawah bacaan akhir. Tidak ditampilkan semua sekaligus supaya
// form tidak memanjang ke bawah; employee menambah hanya yang dipakai.
// Inchas in/out wajib menyebut admin (Inchas) yang menangani uangnya.
const MONEY_FIELDS = [
  { key: 'dp', label: 'DP' },
  { key: 'bi', label: 'BI (bank in)' },
  { key: 'inch_in', label: 'Inchas in', adminField: 'inch_in_admin_id' },
  { key: 'inch_out', label: 'Inchas out', adminField: 'inch_out_admin_id' },
  { key: 'vc', label: 'VC' },
];

export default function EmployeeDashboard({ user, onLogout }) {
  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState('');
  const [outletId, setOutletId] = useState('');
  const [session, setSession] = useState('Pagi');

  const [active, setActive] = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [moneyFields, setMoneyFields] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    apiRequest('/stopmeters')
      .then(response => setHistory(response.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    apiRequest('/stopmeters/context')
      .then(response => {
        const data = response.data || {};
        setContext(data);

        const outlets = data.outlets || [];
        setOutletId(current => current || outlets[0]?.id || '');
        setSession(current => (data.sessions || []).includes(current) ? current : (data.sessions?.[0] || 'Pagi'));
      })
      .catch(err => setContextError(err.message || 'Gagal memuat data shift.'));

    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!outletId) return;

    let cancelled = false;
    setActiveLoading(true);
    setFormError('');

    apiRequest(`/stopmeters/active?outlet_id=${encodeURIComponent(outletId)}&session=${encodeURIComponent(session)}`)
      .then(response => {
        if (cancelled) return;
        setActive(response.data || null);
      })
      .catch(err => {
        if (cancelled) return;
        setActive(null);
        setFormError(err.message || 'Gagal memuat bacaan meter.');
      })
      .finally(() => {
        if (!cancelled) setActiveLoading(false);
      });

    return () => { cancelled = true; };
  }, [outletId, session, receipt]);

  const outlets = context?.outlets || [];
  const outlet = useMemo(
    () => outlets.find(row => row.id === outletId) || null,
    [outlets, outletId]
  );

  // Admin (Inchas) yang ditugaskan pada outlet yang sedang dipilih.
  const outletAdmins = useMemo(() => {
    const admins = context?.admins || [];
    return admins.filter(admin => (admin.outlet_ids || []).includes(outletId));
  }, [context, outletId]);

  const requiresInitial = active?.requires_initial_readings ?? outlet?.requires_initial_readings ?? false;
  const alreadySubmitted = active?.already_submitted === true;
  const locked = alreadySubmitted || submitting;

  const rInitial = requiresInitial ? form.r_initial : active?.r_initial;
  const mInitial = requiresInitial ? form.m_initial : active?.m_initial;

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function changeOutlet(value) {
    // Admin terpilih bisa berbeda per outlet, jadi pilihan Inchas direset.
    setOutletId(value);
    setForm(current => ({ ...current, inch_in_admin_id: '', inch_out_admin_id: '' }));
  }

  function addMoneyField(key) {
    setMoneyFields(current => (current.includes(key) ? current : [...current, key]));
    setPickerOpen(false);
  }

  function removeMoneyField(key) {
    const field = MONEY_FIELDS.find(row => row.key === key);

    setMoneyFields(current => current.filter(row => row !== key));
    setForm(current => ({
      ...current,
      [key]: '',
      ...(field?.adminField ? { [field.adminField]: '' } : {}),
    }));
  }

  function inchasError(fieldKey, adminField, label) {
    if (!moneyFields.includes(fieldKey) || toNumber(form[fieldKey]) <= 0) return '';

    return form[adminField] ? '' : `Pilih admin (Inchas) yang menangani ${label}.`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setReceipt(null);

    if (form.r_current === '' || form.m_current === '') {
      setFormError('Bacaan akhir R dan M wajib diisi.');
      return;
    }

    const inchasMessage = inchasError('inch_in', 'inch_in_admin_id', 'Inchas in')
      || inchasError('inch_out', 'inch_out_admin_id', 'Inchas out');

    if (inchasMessage) {
      setFormError(inchasMessage);
      return;
    }

    const key = idempotencyKey || (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));

    if (!idempotencyKey) setIdempotencyKey(key);

    const payload = {
      outlet_id: outletId,
      session,
      operational_date: context?.operational_date,
      r_current: toNumber(form.r_current),
      m_current: toNumber(form.m_current),
      dp: toNumber(form.dp),
      vc: toNumber(form.vc),
      bi: toNumber(form.bi),
      inch_in: toNumber(form.inch_in),
      inch_out: toNumber(form.inch_out),
    };

    if (toNumber(form.inch_in) > 0 && form.inch_in_admin_id) {
      payload.inch_in_admin_id = form.inch_in_admin_id;
    }

    if (toNumber(form.inch_out) > 0 && form.inch_out_admin_id) {
      payload.inch_out_admin_id = form.inch_out_admin_id;
    }

    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (requiresInitial) {
      payload.r_initial = toNumber(form.r_initial);
      payload.m_initial = toNumber(form.m_initial);
    }

    setSubmitting(true);

    try {
      const response = await apiRequest('/stopmeters', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(payload),
      });

      setReceipt(response.data || null);
      setForm(emptyForm);
      setMoneyFields([]);
      setPickerOpen(false);
      setIdempotencyKey('');
      loadHistory();
    } catch (err) {
      setFormError(err.message || 'Submit gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  if (contextError) {
    return (
      <div className="emp-page">
        <div className="emp-shell">
          <div className="emp-error-card">
            <h2>Tidak bisa memuat shift</h2>
            <p>{contextError}</p>
            <button type="button" className="emp-btn emp-btn-ghost" onClick={onLogout}>Keluar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <header className="emp-header">
        <div>
          <p className="emp-eyebrow">STOPMETER / EMPLOYEE</p>
          <h1>{user?.name || 'Employee'}</h1>
        </div>
        <button type="button" className="emp-btn emp-btn-ghost" onClick={onLogout}>Keluar</button>
      </header>

      <div className="emp-shell">
        {outlets.length === 0 ? (
          <div className="emp-card">
            <h2>Belum ada outlet</h2>
            <p className="emp-muted">
              Akun ini belum ditugaskan ke outlet mana pun. Hubungi Admin untuk penempatan.
            </p>
          </div>
        ) : (
          <>
            <form className="emp-card" onSubmit={handleSubmit}>
              <div className="emp-card-head">
                <div>
                  <h2>Stopmeter Shift</h2>
                  <p className="emp-muted">
                    {dateLabel(context?.operational_date)} · {session}
                  </p>
                </div>
                <span className={`emp-chip ${alreadySubmitted ? 'emp-chip-done' : 'emp-chip-open'}`}>
                  {alreadySubmitted ? 'Sudah final' : 'Belum submit'}
                </span>
              </div>

              <div className="emp-row">
                <label className="emp-field">
                  <span>Outlet</span>
                  <select
                    value={outletId}
                    onChange={e => changeOutlet(e.target.value)}
                    disabled={submitting}
                  >
                    {outlets.map(row => (
                      <option key={row.id} value={row.id}>
                        {row.name}{row.code ? ` (${row.code})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="emp-field">
                  <span>Shift</span>
                  <select
                    value={session}
                    onChange={e => setSession(e.target.value)}
                    disabled={submitting}
                  >
                    {(context?.sessions || ['Pagi', 'Malam']).map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              {activeLoading && <p className="emp-muted">Memuat bacaan meter...</p>}

              {alreadySubmitted && (
                <p className="emp-note emp-note-warn">
                  Shift ini sudah difinalisasi dan terkunci. Hubungi Admin bila perlu koreksi.
                </p>
              )}

              <div className="emp-meters">
                <div className="emp-meter">
                  <small>R awal</small>
                  {requiresInitial ? (
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.r_initial}
                      onChange={e => updateField('r_initial', e.target.value)}
                      placeholder="0"
                      disabled={locked}
                    />
                  ) : (
                    <strong>{rInitial ?? '-'}</strong>
                  )}
                </div>

                <div className="emp-meter">
                  <small>M awal</small>
                  {requiresInitial ? (
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.m_initial}
                      onChange={e => updateField('m_initial', e.target.value)}
                      placeholder="0"
                      disabled={locked}
                    />
                  ) : (
                    <strong>{mInitial ?? '-'}</strong>
                  )}
                </div>
              </div>

              {requiresInitial && !activeLoading && (
                <p className="emp-note">
                  Outlet ini belum punya meter sebelumnya, jadi bacaan awal diisi manual sekali saja.
                </p>
              )}

              <div className="emp-row">
                <label className="emp-field">
                  <span>R akhir <i>*</i></span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    required
                    value={form.r_current}
                    onChange={e => updateField('r_current', e.target.value)}
                    disabled={locked}
                  />
                </label>

                <label className="emp-field">
                  <span>M akhir <i>*</i></span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    required
                    value={form.m_current}
                    onChange={e => updateField('m_current', e.target.value)}
                    disabled={locked}
                  />
                </label>
              </div>

              <div className="emp-money">
                <div className="emp-money-head">
                  <strong>Tambahan</strong>
                  <button
                    type="button"
                    className="emp-btn emp-btn-mini"
                    onClick={() => setPickerOpen(open => !open)}
                    disabled={locked || moneyFields.length === MONEY_FIELDS.length}
                  >
                    {pickerOpen ? 'Batal' : '+ Tambah'}
                  </button>
                </div>

                {pickerOpen && (
                  <div className="emp-picker">
                    {MONEY_FIELDS
                      .filter(field => !moneyFields.includes(field.key))
                      .map(field => (
                        <button
                          key={field.key}
                          type="button"
                          className="emp-picker-item"
                          onClick={() => addMoneyField(field.key)}
                        >
                          {field.label}
                        </button>
                      ))}
                  </div>
                )}

                {moneyFields.length === 0 && !pickerOpen && (
                  <p className="emp-tight">Belum ada tambahan.</p>
                )}

                {moneyFields.map(key => {
                  const field = MONEY_FIELDS.find(row => row.key === key);

                  return (
                    <div className="emp-money-row" key={key}>
                      <span className="emp-money-label">{field.label}</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="0"
                        value={form[key]}
                        onChange={e => updateField(key, e.target.value)}
                        disabled={locked}
                      />
                      <button
                        type="button"
                        className="emp-link"
                        onClick={() => removeMoneyField(key)}
                        disabled={locked}
                      >
                        Hapus
                      </button>

                      {field.adminField && (
                        <label className="emp-money-admin">
                          <span>Admin (Inchas) yang menangani</span>
                          <select
                            value={form[field.adminField]}
                            onChange={e => updateField(field.adminField, e.target.value)}
                            disabled={locked || outletAdmins.length === 0}
                          >
                            <option value="">Pilih nama admin</option>
                            {outletAdmins.map(admin => (
                              <option key={admin.id} value={admin.id}>{admin.name}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      {field.adminField && outletAdmins.length === 0 && (
                        <p className="emp-tight emp-tight-warn">
                          Belum ada admin (Inchas) yang ditugaskan di outlet ini.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className="emp-field">
                <span>Catatan</span>
                <textarea
                  rows={1}
                  maxLength={500}
                  value={form.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  disabled={locked}
                  placeholder="Opsional"
                />
              </label>

              <p className="emp-tight">
                BI (bank in) mengurangi sales net. Selisih R/M boleh minus bila bacaan akhir lebih kecil.
                Total dihitung di server setelah submit.
              </p>

              {formError && <p className="emp-note emp-note-error">{formError}</p>}

              <button type="submit" className="emp-btn emp-btn-primary emp-submit" disabled={locked}>
                {submitting ? 'Menyimpan...' : 'Submit & Finalisasi'}
              </button>
            </form>

            {receipt && (
              <div className="emp-card emp-receipt">
                <div className="emp-card-head">
                  <h2>Stopmeter final</h2>
                  <span className="emp-chip emp-chip-done">{receipt.session}</span>
                </div>

                <div className="emp-summary">
                  <div><small>Total limit</small><strong>{money(receipt.total_limit)}</strong></div>
                  <div><small>Sales net</small><strong>{money(receipt.sales_net)}</strong></div>
                </div>

                <dl className="emp-detail">
                  <div><dt>R</dt><dd>{receipt.r_initial} → {receipt.r_current} ({receipt.r_used})</dd></div>
                  <div><dt>M</dt><dd>{receipt.m_initial} → {receipt.m_current} ({receipt.m_used})</dd></div>
                  <div><dt>DP</dt><dd>{money(receipt.dp)}</dd></div>
                  <div><dt>BI</dt><dd>{money(receipt.bi)}</dd></div>
                  <div>
                    <dt>Inchas in</dt>
                    <dd>
                      {money(receipt.inch_in)}
                      {receipt.inch_in_admin_name ? ` · ${receipt.inch_in_admin_name}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Inchas out</dt>
                    <dd>
                      {money(receipt.inch_out)}
                      {receipt.inch_out_admin_name ? ` · ${receipt.inch_out_admin_name}` : ''}
                    </dd>
                  </div>
                  <div><dt>VC</dt><dd>{money(receipt.vc)}</dd></div>
                </dl>
              </div>
            )}

            <div className="emp-card">
              <div className="emp-card-head">
                <h2>Riwayat saya</h2>
                <span className="emp-muted">{history.length} stopmeter</span>
              </div>

              {historyLoading ? (
                <p className="emp-muted">Memuat riwayat...</p>
              ) : history.length === 0 ? (
                <p className="emp-muted">Belum ada Stopmeter yang disubmit.</p>
              ) : (
                <ul className="emp-history">
                  {history.slice(0, 10).map(row => (
                    <li key={String(row._id || row.id)}>
                      <div>
                        <strong>{dateLabel(String(row.operational_date || '').slice(0, 10))}</strong>
                        <small>{row.session} · {row.outlet_id}</small>
                      </div>
                      <span>{money(row.sales_net)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
